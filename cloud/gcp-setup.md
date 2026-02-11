# GCP Setup Guide — Nimbus FinOps Platform

> Setup steps for connecting Google Cloud Platform projects to Nimbus.

**Status:** 🔜 Planned — Integration not yet built. This doc covers the full architecture and pre-requisites.

---

## 1. Multi-Project Architecture

GCP uses a dual hierarchy — one for **resources** and another for **billing**:

### 1.1 Resource Hierarchy

```
GCP Organization (e.g., poonawallafincorp.com)
├── Folder: "Production"
│   ├── Project: pfl-prod-app
│   ├── Project: pfl-prod-data
│   └── Project: pfl-dr
├── Folder: "Non-Production"
│   ├── Folder: "Development"
│   │   └── Project: pfl-dev
│   ├── Folder: "Staging"
│   │   └── Project: pfl-staging
│   └── Folder: "QA"
│       └── Project: pfl-qa
└── Folder: "Shared Services"
    ├── Project: pfl-networking
    └── Project: pfl-security
```

### 1.2 Billing Hierarchy (Separate from Resources)

```
Billing Account (e.g., "PFL Master Billing")
├── Project: pfl-prod-app        (linked)
├── Project: pfl-prod-data       (linked)
├── Project: pfl-dr              (linked)
├── Project: pfl-dev             (linked)
├── Project: pfl-staging         (linked)
├── Project: pfl-qa              (linked)
├── Project: pfl-networking      (linked)
└── Project: pfl-security        (linked)
```

**Important:** Billing is NOT tied to the resource hierarchy. A single Billing Account can cover projects across multiple Organizations. Multiple Billing Accounts can exist in one Organization.

### Key Concepts

| Concept | Equivalent in AWS | Purpose |
|---------|------------------|---------|
| Organization | AWS Organization | Root of resource hierarchy |
| Folder | Organizational Unit (OU) | Group projects, inherit IAM/policies |
| Project | AWS Account | Resource & API boundary |
| Billing Account | AWS Payer Account | Payment method + invoice grouping |

### Key Principle: 1 Service Account = All Projects

A **Service Account** with roles at the **Organization level** can access ALL projects. For billing data, it needs access to the **Billing Account** or the **BigQuery billing export dataset**.

```
Service Account at Org Level → Resource Manager API → sees all 10-50+ projects
Service Account with BQ Viewer → BigQuery Billing Export → sees all project costs
```

---

## 2. Billing Models

GCP billing is separate from resource hierarchy:

| Agreement | Common In | How Billing Works |
|-----------|----------|-------------------|
| **Self-Serve** | Small/Medium | Credit card billing, per-project |
| **Invoiced Account** | Large enterprises | Net-30/60 invoicing, consolidated |
| **Reseller/Partner** | Partner-managed | Partner manages billing |
| **Committed Use Discounts (CUD)** | Enterprise | 1-3 year commitments, auto-applied |

**For BFSI clients like PFL:** Most likely an Invoiced Account with a single Billing Account covering all projects.

---

## 3. Cost Data Access — BigQuery Billing Export

Unlike AWS/Azure which have real-time cost APIs, GCP's primary cost data channel is **BigQuery Billing Export**.

### 3.1 Export Types

| Export Type | Table | Granularity | Delay |
|------------|-------|-------------|-------|
| **Standard Usage Cost** | `gcp_billing_export_v1_XXXXXX_YYYYYY` | Resource-level | ~4-6 hours |
| **Detailed Usage Cost** | `gcp_billing_export_resource_v1_XXXXXX_YYYYYY` | SKU + labels + resource | ~4-6 hours |
| **Pricing** | `cloud_pricing_export` | Per-SKU pricing | Daily |

### 3.2 Enable Billing Export

In GCP Console → Billing → Billing Export → BigQuery Export:

```bash
# 1. Create a dedicated dataset for billing data
bq mk --dataset --location=US \
  pfl-shared-services:nimbus_billing_export

# 2. Enable via Console (no CLI equivalent):
#    - Go to Billing → Billing Export → BigQuery Export
#    - Select the dataset: nimbus_billing_export
#    - Enable: Standard usage cost + Detailed usage cost + Pricing
```

### 3.3 Sample Cost Query

```sql
-- Monthly cost by project for current month
SELECT
  project.id AS project_id,
  project.name AS project_name,
  service.description AS service_name,
  SUM(cost) + SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net_cost,
  invoice.month AS invoice_month
FROM `pfl-shared-services.nimbus_billing_export.gcp_billing_export_v1_XXXXXX_YYYYYY`
WHERE invoice.month = FORMAT_DATE('%Y%m', CURRENT_DATE())
GROUP BY project_id, project_name, service_name, invoice_month
ORDER BY net_cost DESC
```

---

## 4. What Nimbus Will Read

| What Nimbus Reads | GCP Service | Cost | Scope |
|-------------------|-------------|------|-------|
| Cost data (MTD, trends, forecasts) | BigQuery Billing Export | **~$0.02/GB storage + $6.25/TB queried** | Billing Account (all projects) |
| Resource inventory | Cloud Asset Inventory | **Free** | Organization |
| Rightsizing recommendations | Recommender API | **Free** | Organization or per-project |
| Compliance/governance | Organization Policy + SCC | **Free** (Standard tier) | Organization |
| Budgets | Cloud Billing Budget API | **Free** | Billing Account |
| Labels/Tags | Resource Manager API | **Free** | Organization |

**Estimated monthly cost:** ~$1-3/month (BigQuery queries on billing data, with caching to minimize scans)

---

## 5. Credential Setup

### 5.1 Create Service Account

```bash
# Create in the shared-services project (or any project)
gcloud iam service-accounts create nimbus-finops-reader \
  --display-name="Nimbus FinOps Reader" \
  --project=pfl-shared-services
```

### 5.2 Assign Organization-Level Roles

```bash
ORG_ID=$(gcloud organizations list --format="value(ID)")
SA_EMAIL="nimbus-finops-reader@pfl-shared-services.iam.gserviceaccount.com"

# Billing Account Viewer — see all project costs
gcloud organizations add-iam-policy-binding $ORG_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/billing.viewer"

# Cloud Asset Viewer — resource inventory across all projects
gcloud organizations add-iam-policy-binding $ORG_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudasset.viewer"

# Recommender Viewer — rightsizing recommendations
gcloud organizations add-iam-policy-binding $ORG_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/recommender.viewer"

# Browser — list projects and folders (minimal read)
gcloud organizations add-iam-policy-binding $ORG_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/browser"
```

### 5.3 Assign BigQuery Roles (for Billing Export Dataset)

```bash
# BigQuery Data Viewer on the billing export dataset
bq add-iam-policy-binding \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/bigquery.dataViewer" \
  pfl-shared-services:nimbus_billing_export

# BigQuery Job User — ability to run queries
gcloud projects add-iam-policy-binding pfl-shared-services \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/bigquery.jobUser"
```

### 5.4 Create Service Account Key

```bash
gcloud iam service-accounts keys create nimbus-gcp-key.json \
  --iam-account=$SA_EMAIL

# Base64 encode for storage as environment variable
cat nimbus-gcp-key.json | base64 > nimbus-gcp-key.b64
```

---

## 6. API Endpoints

### BigQuery (Cost Data)

```
POST https://bigquery.googleapis.com/bigquery/v2/projects/{projectId}/jobs
Authorization: Bearer {access_token}

Body: {
  "configuration": {
    "query": {
      "query": "SELECT ... FROM `billing_export` ...",
      "useLegacySql": false
    }
  }
}
```

Or using the BigQuery client library (recommended):
```typescript
import { BigQuery } from '@google-cloud/bigquery';
const bigquery = new BigQuery({ projectId: 'pfl-shared-services' });
const [rows] = await bigquery.query({ query: '...' });
```

### Cloud Asset Inventory (Resource Inventory)

```
POST https://cloudasset.googleapis.com/v1/organizations/{orgId}:searchAllResources
Authorization: Bearer {access_token}

Body: {
  "query": "state:ACTIVE",
  "assetTypes": ["compute.googleapis.com/Instance", "storage.googleapis.com/Bucket"],
  "pageSize": 500
}
```

### Recommender API (Rightsizing)

```
GET https://recommender.googleapis.com/v1/projects/{project}/locations/{zone}/recommenders/google.compute.instance.MachineTypeRecommender/recommendations
Authorization: Bearer {access_token}
```

### Cloud Billing Budget API

```
GET https://billingbudgets.googleapis.com/v1/billingAccounts/{billingAccountId}/budgets
Authorization: Bearer {access_token}
```

---

## 7. Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `GCP_SERVICE_ACCOUNT_JSON` | Base64-encoded JSON key file | Yes |
| `GCP_PROJECT_ID` | Project where BigQuery jobs run (e.g., `pfl-shared-services`) | Yes |
| `GCP_BILLING_DATASET` | BigQuery dataset with billing export (e.g., `pfl-shared-services.nimbus_billing_export`) | Yes |
| `GCP_BILLING_TABLE` | Billing export table name (e.g., `gcp_billing_export_v1_XXXXXX_YYYYYY`) | Yes |
| `GCP_ORG_ID` | Organization ID for resource/asset queries | For multi-project |

Note: No per-project credentials needed — Organization-level roles cover all projects.

---

## 8. IAM Permissions Summary

| Role | Scope | Purpose |
|------|-------|---------|
| `roles/billing.viewer` | Organization | View billing data and budgets |
| `roles/cloudasset.viewer` | Organization | Resource inventory across all projects |
| `roles/recommender.viewer` | Organization | Rightsizing and cost recommendations |
| `roles/browser` | Organization | List projects and folders |
| `roles/bigquery.dataViewer` | Billing Export Dataset | Read billing export tables |
| `roles/bigquery.jobUser` | Shared Services Project | Run BigQuery queries |

---

## 9. Security Checklist

- [ ] Service Account has read-only roles only
- [ ] No Editor or Owner roles assigned
- [ ] JSON key stored as environment variable (not in code)
- [ ] All API calls are server-side
- [ ] No resources created or modified in the client's organization
- [ ] Key rotation policy: rotate every 12 months
- [ ] Consider Workload Identity Federation for keyless auth in production

---

## 10. GCP-Specific Considerations

### 10.1 BigQuery Cost Optimization

- **Use partitioned tables**: Billing export tables are automatically date-partitioned
- **Always filter by date**: Include `WHERE _PARTITIONTIME >= TIMESTAMP("2025-01-01")` to avoid full table scans
- **Cache results**: BigQuery charges per TB scanned — cache results for 10-15 minutes
- **Use `SELECT` specific columns**: Avoid `SELECT *` on billing export (hundreds of columns)

### 10.2 Committed Use Discounts vs. Sustained Use

| Discount Type | How It Works | Nimbus Visibility |
|--------------|-------------|-------------------|
| **Sustained Use Discount (SUD)** | Automatic 30% discount after 25% monthly usage | Appears as credits in billing export |
| **Committed Use Discount (CUD)** | 1-3 year commitment, up to 70% savings | Appears as commitment line items |
| **Flex CUD** | 1-year, cancellable, smaller discount | Same as CUD |

### 10.3 Labels Strategy

GCP relies heavily on **labels** for cost allocation (similar to AWS tags):

```bash
# Example: Label all resources by team and environment
gcloud compute instances update vm-1 \
  --update-labels=team=data-engineering,environment=production,cost-center=CC-1234
```

Nimbus can group costs by label in BigQuery:
```sql
SELECT labels.key, labels.value, SUM(cost) AS total_cost
FROM `billing_export`, UNNEST(labels) AS labels
WHERE invoice.month = '202501'
GROUP BY labels.key, labels.value
ORDER BY total_cost DESC
```

---

*Integration will be built when GCP onboarding begins. The setup steps above can be run in advance to have credentials ready.*
