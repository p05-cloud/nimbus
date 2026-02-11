# Oracle Cloud Infrastructure (OCI) Setup Guide — Nimbus FinOps Platform

> Setup steps for connecting an Oracle Cloud tenancy to Nimbus.

**Status:** 🔜 Planned — Integration not yet built. This doc covers the full architecture and pre-requisites.

---

## 1. Multi-Compartment Architecture

OCI uses a **Compartment** hierarchy within a single **Tenancy** (no cross-tenancy aggregation like AWS Organizations):

```
OCI Tenancy (e.g., poonawallafincorp)
├── Root Compartment (implicit — contains everything)
│   ├── Compartment: "Production"
│   │   ├── Sub-Compartment: "Prod-App"
│   │   ├── Sub-Compartment: "Prod-Data"
│   │   └── Sub-Compartment: "Prod-DR"
│   ├── Compartment: "Non-Production"
│   │   ├── Sub-Compartment: "Dev"
│   │   ├── Sub-Compartment: "Staging"
│   │   └── Sub-Compartment: "QA"
│   ├── Compartment: "Shared Services"
│   │   ├── Sub-Compartment: "Networking"
│   │   └── Sub-Compartment: "Security"
│   └── Compartment: "Sandbox"
│       └── Sub-Compartment: "Experiments"
```

### Key Concepts

| Concept | Equivalent in AWS | Purpose |
|---------|------------------|---------|
| Tenancy | AWS Organization | Root boundary (1 per Oracle account) |
| Compartment | AWS Account (loosely) | Logical grouping for resources + billing |
| Sub-Compartment | OU / nested Account | Nested compartments (up to 6 levels) |
| Region | AWS Region | Geographic deployment |
| Availability Domain | Availability Zone | Data center within region |

### Key Differences from AWS/Azure/GCP

1. **Single Tenancy = Single Billing**: Unlike AWS (where each account gets its own bill), OCI has ONE bill per tenancy. Compartments are logical groupings, not separate billing entities.
2. **No Cross-Tenancy Aggregation**: There's no "Organization" spanning multiple tenancies. If PFL has separate tenancies for different BUs, each needs its own Nimbus connection.
3. **Compartment-Based Isolation**: IAM policies are written at compartment level and can be inherited by sub-compartments.
4. **Cost Tracking via Tags**: OCI uses **Cost-Tracking Tags** and **Tag Namespaces** for cost allocation across compartments.

### Key Principle: 1 API Key at Root = All Compartments

A user/service with policies at the **Tenancy (root compartment)** level can see ALL compartments and resources:

```
API Key at Tenancy Level → Usage API → sees all compartment costs
                         → Search API → sees all resources
                         → Cloud Advisor → sees all recommendations
```

---

## 2. Billing Models

| Agreement | Common In | How Billing Works |
|-----------|----------|-------------------|
| **Pay-As-You-Go (PAYG)** | Small/Medium | Credit card, no commitment |
| **Annual Universal Credits** | Enterprise | Prepaid credits, up to 60% discount |
| **Monthly Universal Credits** | Mid-size | Monthly prepaid, smaller discounts |
| **Bring Your Own License (BYOL)** | Oracle DB/Middleware | Use existing Oracle licenses |
| **Always Free** | Dev/Test | Permanently free tier for select services |

**For BFSI clients like PFL:** Most likely Annual Universal Credits with enterprise pricing.

### OCI Pricing Advantages

- **No data egress charges** for many scenarios (unique among clouds)
- **OCPU** = 2 vCPUs (different pricing model from AWS/Azure)
- **Universal Credits** can be used across all OCI services
- Significant discounts for Oracle Database workloads (vs. running Oracle DB on other clouds)

---

## 3. What Nimbus Will Read

| What Nimbus Reads | OCI Service | Cost | Scope |
|-------------------|-------------|------|-------|
| Cost data (MTD, trends) | Usage API (Cost Analysis) | **Free** | Tenancy (all compartments) |
| Resource inventory | OCI Search (Resource Query) | **Free** | Tenancy (all compartments) |
| Rightsizing recommendations | Cloud Advisor | **Free** | Tenancy |
| Compliance/governance | Cloud Guard | **Free** (basic) | Tenancy |
| Budgets & alerts | Budgets API | **Free** | Compartment or Tenancy |
| Tagging/cost allocation | Tagging API | **Free** | Tenancy |

**Total API cost: Free** (OCI Usage APIs have no per-request charges)

---

## 4. Credential Setup

OCI supports two authentication methods. We recommend **API Key** for simplicity:

### 4.1 Create a Service User (Recommended)

```bash
# Create a group for Nimbus
oci iam group create \
  --compartment-id <TENANCY_OCID> \
  --name "NimbusFinOpsReaders" \
  --description "Read-only access for Nimbus FinOps platform"

# Create a service user
oci iam user create \
  --compartment-id <TENANCY_OCID> \
  --name "nimbus-finops-reader" \
  --description "Nimbus FinOps read-only service user"

# Add user to the group
oci iam group add-user \
  --group-id <GROUP_OCID> \
  --user-id <USER_OCID>
```

### 4.2 Generate API Signing Key

```bash
# Generate RSA key pair
openssl genrsa -out nimbus-oci-key.pem 2048
openssl rsa -in nimbus-oci-key.pem -pubout -out nimbus-oci-key-public.pem

# Upload public key to the service user
oci iam user api-key upload \
  --user-id <USER_OCID> \
  --key-file nimbus-oci-key-public.pem
```

Save the output:
- `fingerprint` → `OCI_FINGERPRINT`
- `tenancy` → `OCI_TENANCY_OCID`
- `user` → `OCI_USER_OCID`

### 4.3 Create IAM Policies

```bash
# Policy at tenancy level for cost and resource read access
oci iam policy create \
  --compartment-id <TENANCY_OCID> \
  --name "NimbusFinOpsPolicy" \
  --description "Read-only access for Nimbus FinOps" \
  --statements '[
    "Allow group NimbusFinOpsReaders to read usage-reports in tenancy",
    "Allow group NimbusFinOpsReaders to read usage-budgets in tenancy",
    "Allow group NimbusFinOpsReaders to read all-resources in tenancy",
    "Allow group NimbusFinOpsReaders to read cloud-advisor-recommendations in tenancy",
    "Allow group NimbusFinOpsReaders to read cloud-guard-problems in tenancy",
    "Allow group NimbusFinOpsReaders to read compartments in tenancy",
    "Allow group NimbusFinOpsReaders to read tag-namespaces in tenancy"
  ]'
```

### Key Policy Statements Explained

| Policy | What It Allows |
|--------|---------------|
| `read usage-reports` | Cost data via Usage API (Cost Analysis) |
| `read usage-budgets` | Budget tracking and alerts |
| `read all-resources` | Resource inventory via Search API |
| `read cloud-advisor-recommendations` | Rightsizing and optimization recommendations |
| `read cloud-guard-problems` | Security and compliance findings |
| `read compartments` | List compartment hierarchy |
| `read tag-namespaces` | Cost allocation tags |

---

## 5. API Endpoints

### Usage API — Cost Analysis

```
POST https://usageapi.{region}.oci.oraclecloud.com/20200107/usage

Body: {
  "tenantId": "<TENANCY_OCID>",
  "timeUsageStarted": "2025-01-01T00:00:00Z",
  "timeUsageEnded": "2025-01-31T23:59:59Z",
  "granularity": "DAILY",
  "groupBy": ["service", "compartmentId", "region"],
  "queryType": "COST"
}
```

### Usage API — Forecast

```
POST https://usageapi.{region}.oci.oraclecloud.com/20200107/usage

Body: {
  "tenantId": "<TENANCY_OCID>",
  "timeUsageStarted": "2025-02-01T00:00:00Z",
  "timeUsageEnded": "2025-02-28T23:59:59Z",
  "granularity": "MONTHLY",
  "queryType": "COST",
  "isForecast": true
}
```

### OCI Search — Resource Inventory

```
POST https://query.{region}.oci.oraclecloud.com/20180409/resources

Body: {
  "type": "Structured",
  "query": "query all resources where lifeCycleState = 'ACTIVE'"
}
```

### Cloud Advisor — Recommendations

```
GET https://optimizer.{region}.oci.oraclecloud.com/20200606/recommendations?compartmentId={tenancyOcid}&compartmentIdInSubtree=true
```

### Budgets API

```
GET https://usage.{region}.oci.oraclecloud.com/20190111/budgets?compartmentId={tenancyOcid}&targetType=COMPARTMENT
```

---

## 6. Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `OCI_TENANCY_OCID` | Tenancy OCID (e.g., `ocid1.tenancy.oc1..aaaa...`) | Yes |
| `OCI_USER_OCID` | Service user OCID | Yes |
| `OCI_FINGERPRINT` | API key fingerprint | Yes |
| `OCI_PRIVATE_KEY` | Base64-encoded PEM private key | Yes |
| `OCI_REGION` | Home region (e.g., `ap-mumbai-1`) | Yes |

Note: No per-compartment credentials needed — Tenancy-level policies cover all compartments.

---

## 7. IAM Permissions Summary

| Policy Statement | Scope | Purpose |
|-----------------|-------|---------|
| `read usage-reports` | Tenancy | Cost data for all compartments |
| `read usage-budgets` | Tenancy | Budget tracking |
| `read all-resources` | Tenancy | Resource inventory |
| `read cloud-advisor-recommendations` | Tenancy | Rightsizing recommendations |
| `read cloud-guard-problems` | Tenancy | Security findings |
| `read compartments` | Tenancy | Compartment hierarchy |
| `read tag-namespaces` | Tenancy | Cost allocation tags |

---

## 8. Security Checklist

- [ ] Service user has read-only policies only
- [ ] No `manage` or `use` verbs in any policy
- [ ] Private key stored as environment variable (not in code)
- [ ] All API calls are server-side
- [ ] No resources created or modified in the client's tenancy
- [ ] Key rotation policy: rotate every 12 months
- [ ] Consider Instance Principal for OCI-hosted deployments (no key needed)

---

## 9. OCI-Specific Considerations

### 9.1 Multi-Region

OCI resources are regional. To get a complete inventory:
- **Usage API**: Returns costs across all regions automatically
- **Search API**: Can be scoped to tenancy-wide (includes all regions)
- **Cloud Advisor**: Aggregates across all regions

No per-region API calls needed for cost data — the Usage API aggregates automatically.

### 9.2 Cost Allocation Tags

OCI uses **Tag Namespaces** with **Cost-Tracking** enabled:

```bash
# Create a cost-tracking tag namespace
oci iam tag-namespace create \
  --compartment-id <TENANCY_OCID> \
  --name "CostCenter" \
  --description "Cost allocation tags"

# Create a cost-tracking tag
oci iam tag create \
  --tag-namespace-id <NAMESPACE_OCID> \
  --name "Department" \
  --description "Department for cost allocation" \
  --is-cost-tracking true
```

Nimbus can then group costs by these tags in the Usage API:
```json
{
  "groupBy": ["tag/CostCenter/Department"],
  "queryType": "COST"
}
```

### 9.3 Universal Credits Tracking

For enterprise clients on Universal Credits:
- **Commitment**: Total credits purchased
- **Consumed**: Credits used (mapped to Usage API cost data)
- **Balance**: Remaining credits
- **Overage**: Costs exceeding commitment (charged at PAYG rates)

The Usage API includes credit consumption data, which Nimbus can use to show burn rate and forecast credit depletion.

### 9.4 OCI vs Other Clouds — Key Differences for FinOps

| Feature | AWS | Azure | GCP | OCI |
|---------|-----|-------|-----|-----|
| Data egress cost | High | High | High | **Often free** |
| CPU unit | vCPU | vCPU | vCPU | **OCPU (= 2 vCPUs)** |
| Cost API | Free | Free | BigQuery ($) | **Free** |
| Billing boundary | Account | Subscription | Project | **Tenancy** |
| Multi-org aggregation | Organizations | Management Groups | Org Node | **N/A (single tenancy)** |

---

*Integration will be built when OCI onboarding begins. The setup steps above can be run in advance to have credentials ready.*
