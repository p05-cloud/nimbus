# Azure Setup Guide — Nimbus FinOps Platform

> Setup steps for connecting a Microsoft Azure subscription to Nimbus.

**Status:** 🔜 Planned — Integration not yet built.

---

## Planned Architecture

| What Nimbus Will Read | Azure Service | Cost |
|----------------------|---------------|------|
| Cost data | Azure Cost Management API | Free |
| Resource inventory | Azure Resource Graph | Free |
| Rightsizing recommendations | Azure Advisor | Free |
| Compliance | Azure Policy | Free |

## Pre-requisites (for when integration is built)

1. **Azure AD App Registration** with:
   - Cost Management Reader role on the subscription
   - Reader role for resource inventory

2. **Environment Variables:**
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_TENANT_ID`
   - `AZURE_SUBSCRIPTION_ID`

3. **API Permissions:**
   - `Microsoft.CostManagement/query/read`
   - `Microsoft.Resources/resources/read`
   - `Microsoft.Advisor/recommendations/read`

---

*This guide will be completed when Azure integration is built.*
