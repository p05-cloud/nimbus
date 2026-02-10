# GCP Setup Guide — Nimbus FinOps Platform

> Setup steps for connecting a Google Cloud Platform project to Nimbus.

**Status:** 🔜 Planned — Integration not yet built.

---

## Planned Architecture

| What Nimbus Will Read | GCP Service | Cost |
|----------------------|-------------|------|
| Cost data | BigQuery Billing Export | Free (BigQuery storage ~$0.02/GB) |
| Resource inventory | Cloud Asset Inventory | Free |
| Rightsizing recommendations | Recommender API | Free |
| Compliance | Security Command Center | Free (Standard tier) |

## Pre-requisites (for when integration is built)

1. **Service Account** with:
   - BigQuery Data Viewer role
   - Cloud Asset Viewer role
   - Recommender Viewer role

2. **Billing Export** enabled to BigQuery:
   - Go to Billing → Billing Export → BigQuery Export
   - Enable standard and detailed usage cost exports

3. **Environment Variables:**
   - `GCP_SERVICE_ACCOUNT_JSON` (base64-encoded JSON key)
   - `GCP_PROJECT_ID`
   - `GCP_BILLING_DATASET` (BigQuery dataset name)

---

*This guide will be completed when GCP integration is built.*
