# Cloud Provider Setup — Nimbus FinOps Platform

This folder contains setup guides for connecting cloud provider accounts to Nimbus.
Use these guides when onboarding new clients (PFL, ACC, etc.).

## Available Guides

| Provider | Guide | Status | API Cost | Multi-Account |
|----------|-------|--------|----------|---------------|
| **AWS** | [aws-setup.md](./aws-setup.md) | ✅ Live | ~$3-6/mo | ✅ Organizations |
| **Azure** | [azure-setup.md](./azure-setup.md) | 🔜 Planned | Free | ✅ Management Groups |
| **GCP** | [gcp-setup.md](./gcp-setup.md) | 🔜 Planned | ~$1-3/mo | ✅ Organization + Folders |
| **Oracle Cloud** | [oci-setup.md](./oci-setup.md) | 🔜 Planned | Free | ✅ Compartments |

---

## Multi-Account Strategy — "1 Credential = All Accounts"

Every cloud provider supports a hierarchical structure. Nimbus connects at the **top of the hierarchy** so a single credential covers all accounts/subscriptions/projects/compartments.

### Hierarchy Comparison

```
AWS:     Organization → OUs → Accounts → Resources
Azure:   AD Tenant → Management Groups → Subscriptions → Resource Groups → Resources
GCP:     Organization → Folders → Projects → Resources
OCI:     Tenancy → Compartments → Sub-Compartments → Resources
```

### Credential Strategy Per Provider

| Provider | Credential Type | Scope | What It Sees |
|----------|----------------|-------|--------------|
| **AWS** | IAM User in Management Account | Organization | All linked accounts (Cost Explorer, Resource Explorer, Compute Optimizer) |
| **Azure** | Service Principal (App Registration) | Root Management Group | All subscriptions (Cost Management API, Resource Graph, Advisor) |
| **GCP** | Service Account | Organization + BigQuery Dataset | All projects (BigQuery billing, Cloud Asset Inventory, Recommender) |
| **OCI** | API Key (Service User) | Tenancy (Root Compartment) | All compartments (Usage API, Search API, Cloud Advisor) |

### Cost API Comparison

| Feature | AWS | Azure | GCP | OCI |
|---------|-----|-------|-----|-----|
| **Cost API** | Cost Explorer API | Cost Management Query API | BigQuery Billing Export | Usage API |
| **Real-time?** | Near real-time (~8-12h) | Near real-time (~8-12h) | ~4-6 hours delay | Near real-time |
| **API cost** | $0.01/request | Free | ~$6.25/TB queried | Free |
| **Resource-level** | CUR 2.0 (S3 export) | Cost Management Exports | Detailed billing export | Usage API with groupBy |
| **Recommendations** | Compute Optimizer | Azure Advisor | Recommender API | Cloud Advisor |
| **Recommendation cost** | Free | Free | Free | Free |
| **Resource inventory** | Resource Explorer | Resource Graph | Cloud Asset Inventory | Search API |

---

## Quick Reference — What Each Provider Needs

### AWS (Live) — [Full Guide](./aws-setup.md)

**Single Account:**
1. Create IAM user `nimbus-finops-svc` with read-only policies
2. Enable Resource Explorer (free)
3. Enable Compute Optimizer (free)
4. Optionally enable AWS Config (~$2-3/mo)
5. Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` env vars

**Multi-Account (Organizations):**
1. Create IAM user in **Management Account**
2. Cost Explorer automatically aggregates all linked accounts
3. Create Resource Explorer **aggregator index** in management account
4. Enable Compute Optimizer at **Organization level**
5. Create Config **Aggregator** for cross-account compliance
6. Consider CUR 2.0 export to S3 for resource-level granularity

### Azure (Planned) — [Full Guide](./azure-setup.md)

1. Create App Registration (Service Principal) in Azure AD
2. Assign `Cost Management Reader` at **Root Management Group** (covers all subscriptions)
3. Optionally assign `Reader` at Root MG for Resource Graph queries
4. Set `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` env vars
5. No per-subscription configuration needed

### GCP (Planned) — [Full Guide](./gcp-setup.md)

1. Create Service Account in a shared-services project
2. Assign `Billing Viewer`, `Cloud Asset Viewer`, `Recommender Viewer` at **Organization level**
3. Enable **BigQuery Billing Export** (standard + detailed)
4. Assign `BigQuery Data Viewer` on billing export dataset
5. Set `GCP_SERVICE_ACCOUNT_JSON`, `GCP_PROJECT_ID`, `GCP_BILLING_DATASET` env vars

### Oracle Cloud (Planned) — [Full Guide](./oci-setup.md)

1. Create service user and group in OCI
2. Write IAM policies at **Tenancy level** for read-only access
3. Generate API signing key pair
4. Set `OCI_TENANCY_OCID`, `OCI_USER_OCID`, `OCI_FINGERPRINT`, `OCI_PRIVATE_KEY`, `OCI_REGION` env vars
5. No per-compartment configuration needed

---

## Security Principles

All cloud integrations follow these rules:

- **Read-only access** — Nimbus never modifies, creates, or deletes cloud resources
- **Minimal permissions** — Only the specific API calls needed, nothing more
- **Server-side only** — Credentials are used in Next.js Server Components, never exposed to the browser
- **Env var storage** — Credentials stored as environment variables, never in code or git
- **Caching** — All API responses cached 5-15 minutes to minimize API calls and costs
- **Top-of-hierarchy** — 1 credential per cloud, connected at the org/tenant/root level

---

## FOCUS Schema — Vendor-Neutral Normalization

All cost data from every provider is normalized to the [FinOps Foundation FOCUS spec](https://focus.finops.org/):

| FOCUS Column | AWS Source | Azure Source | GCP Source | OCI Source |
|-------------|-----------|-------------|-----------|-----------|
| `BillingPeriod` | `bill/BillingPeriodStartDate` | `BillingPeriodStartDate` | `invoice.month` | `timeUsageStarted` |
| `ServiceName` | `lineItem/ProductCode` | `MeterCategory` | `service.description` | `service` |
| `SubAccountId` | `lineItem/UsageAccountId` | `SubscriptionId` | `project.id` | `compartmentId` |
| `Region` | `product/Region` | `ResourceLocation` | `location.region` | `region` |
| `BilledCost` | `lineItem/UnblendedCost` | `CostInBillingCurrency` | `cost` | `computedAmount` |
| `EffectiveCost` | `lineItem/NetUnblendedCost` | `CostInBillingCurrency - credits` | `cost + credits` | `computedAmount` |

This means the Nimbus dashboard shows all clouds in the same format — users can compare AWS vs Azure vs GCP costs side-by-side.

---

## Onboarding Checklist

When onboarding a new client (e.g., PFL), use this checklist:

- [ ] **Discovery**: Identify which clouds the client uses and how many accounts/subscriptions/projects
- [ ] **AWS**: Follow [aws-setup.md](./aws-setup.md) — create IAM user, enable services, get credentials
- [ ] **Azure**: Follow [azure-setup.md](./azure-setup.md) — create Service Principal, assign roles, get credentials
- [ ] **GCP**: Follow [gcp-setup.md](./gcp-setup.md) — create Service Account, enable billing export, get credentials
- [ ] **OCI**: Follow [oci-setup.md](./oci-setup.md) — create API key, write policies, get credentials
- [ ] **Configure Nimbus**: Set all env vars in Render/Vercel dashboard
- [ ] **Verify**: Check dashboard loads real data for each connected cloud
- [ ] **Budgets**: Set up budget alerts per cloud
- [ ] **Tags/Labels**: Ensure client has a tagging strategy for cost allocation
