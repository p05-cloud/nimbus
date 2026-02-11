# Azure Setup Guide — Nimbus FinOps Platform

> Setup steps for connecting Microsoft Azure subscriptions to Nimbus.

**Status:** 🔜 Planned — Integration not yet built. This doc covers the full architecture and pre-requisites.

---

## 1. Multi-Subscription Architecture

Azure uses a hierarchical structure under an Azure AD (Entra ID) tenant:

```
Azure AD Tenant (e.g., poonawallafincorp.com)
├── Root Management Group (implicit — contains everything)
│   ├── Management Group: "Production"
│   │   ├── Subscription: PFL-Prod-App
│   │   ├── Subscription: PFL-Prod-Data
│   │   └── Subscription: PFL-DR
│   ├── Management Group: "Non-Production"
│   │   ├── Subscription: PFL-Dev
│   │   ├── Subscription: PFL-Staging
│   │   └── Subscription: PFL-QA
│   └── Management Group: "Shared Services"
│       └── Subscription: PFL-Networking
```

### Key Concepts

| Concept | Equivalent in AWS | Purpose |
|---------|------------------|---------|
| Azure AD Tenant | AWS Organization | Identity & access boundary |
| Management Group | Organizational Unit (OU) | Policy & RBAC inheritance |
| Subscription | AWS Account | Billing & resource boundary |
| Resource Group | (no exact equivalent) | Logical grouping within subscription |

### Key Principle: 1 Credential = All Subscriptions

A **Service Principal** with `Cost Management Reader` at the **root Management Group** sees ALL subscriptions in the tenant. No need to configure per-subscription access.

```
Service Principal at Root MG → Cost Management API → sees all 10-50+ subscriptions
```

---

## 2. Billing Models

Azure has different billing agreement types. The API approach is the same, but the scope differs:

| Agreement | Common In | Billing Scope |
|-----------|----------|---------------|
| **Enterprise Agreement (EA)** | Large enterprises | Enrollment Account → Subscriptions |
| **Microsoft Customer Agreement (MCA)** | Medium-large | Billing Account → Billing Profiles → Invoice Sections → Subscriptions |
| **CSP (Cloud Solution Provider)** | Partner-managed | Partner manages billing |
| **Pay-As-You-Go** | Small / individual | Per-subscription billing |

**For BFSI clients like PFL:** Most likely EA or MCA. Both support consolidated billing across all subscriptions.

---

## 3. What Nimbus Will Read

| What Nimbus Reads | Azure Service | Cost | Scope |
|-------------------|---------------|------|-------|
| Cost data (MTD, trends, forecasts) | Cost Management Query API | **Free** | Management Group or Billing Account |
| Resource inventory | Azure Resource Graph | **Free** | Management Group |
| Rightsizing recommendations | Azure Advisor | **Free** | Per subscription (aggregated via MG) |
| Compliance/governance | Azure Policy | **Free** | Management Group |
| Budgets | Cost Management Budgets API | **Free** | Management Group or Subscription |

**Total API cost: Free** (Azure Cost Management APIs have no per-request charges)

---

## 4. Credential Setup

### 4.1 Create App Registration (Service Principal)

In Azure Portal → Azure AD → App registrations → New registration:
- Name: `nimbus-finops-reader`
- Supported account types: "Accounts in this organizational directory only"
- No redirect URI needed

Or via CLI:
```bash
az ad app create --display-name nimbus-finops-reader
az ad sp create --id <APP_ID>
```

### 4.2 Create Client Secret

```bash
az ad app credential reset --id <APP_ID> --append
```

Save the output:
- `appId` → `AZURE_CLIENT_ID`
- `password` → `AZURE_CLIENT_SECRET`
- `tenant` → `AZURE_TENANT_ID`

### 4.3 Assign Cost Management Reader at Root Management Group

```bash
# Get the root management group ID (usually same as tenant ID)
az account management-group list --query "[?displayName=='Tenant Root Group'].id" -o tsv

# Assign Cost Management Reader role
az role assignment create \
  --assignee <APP_ID> \
  --role "Cost Management Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/<ROOT_MG_ID>"
```

This single role assignment covers ALL subscriptions in the tenant.

### 4.4 Additional Roles (Optional)

For resource inventory and recommendations:
```bash
# Reader role at root MG (for Azure Resource Graph queries)
az role assignment create \
  --assignee <APP_ID> \
  --role "Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/<ROOT_MG_ID>"
```

---

## 5. API Endpoints

### Cost Management Query API

```
POST https://management.azure.com/{scope}/providers/Microsoft.CostManagement/query?api-version=2023-11-01
```

Where `{scope}` can be:
- `/providers/Microsoft.Management/managementGroups/{mgGroupId}` — ALL subscriptions
- `/providers/Microsoft.Billing/billingAccounts/{billingAccountId}` — all subscriptions under billing account
- `/subscriptions/{subscriptionId}` — single subscription

### Azure Resource Graph (Resource Inventory)

```
POST https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2022-10-01

Body: {
  "query": "Resources | summarize count() by type, location, subscriptionId"
}
```

### Azure Advisor (Recommendations)

```
GET https://management.azure.com/subscriptions/{subId}/providers/Microsoft.Advisor/recommendations?api-version=2022-10-01
```

### Cost Management Exports (Batch — like AWS CUR)

```
PUT https://management.azure.com/{scope}/providers/Microsoft.CostManagement/exports/{exportName}?api-version=2023-11-01
```

Delivers daily/monthly CSV or FOCUS-format files to Azure Blob Storage.

---

## 6. Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `AZURE_CLIENT_ID` | App registration Application ID | Yes |
| `AZURE_CLIENT_SECRET` | Client secret | Yes |
| `AZURE_TENANT_ID` | Azure AD Tenant ID | Yes |

Note: No `AZURE_SUBSCRIPTION_ID` needed — querying at Management Group scope covers all subscriptions.

---

## 7. IAM Permissions Summary

| Role | Scope | Purpose |
|------|-------|---------|
| `Cost Management Reader` | Root Management Group | Cost data for all subscriptions |
| `Reader` (optional) | Root Management Group | Resource Graph queries, Advisor |

---

## 8. Security Checklist

- [ ] Service Principal has read-only roles only
- [ ] No Owner or Contributor roles assigned
- [ ] Client secret stored as environment variable (not in code)
- [ ] All API calls are server-side
- [ ] No resources created or modified in the client's tenant
- [ ] Secret rotation policy: rotate every 12 months

---

## 9. Cost Management Exports (For Scale)

For clients with 50+ subscriptions, set up scheduled exports:

```bash
az costmanagement export create \
  --name nimbus-daily \
  --scope "/providers/Microsoft.Management/managementGroups/<ROOT_MG_ID>" \
  --storage-account-id "/subscriptions/<SUB>/resourceGroups/<RG>/providers/Microsoft.Storage/storageAccounts/<ACCOUNT>" \
  --storage-container exports \
  --timeframe MonthToDate \
  --recurrence Daily \
  --schedule-recurrence-period from="2025-01-01T00:00:00Z" to="2026-12-31T00:00:00Z"
```

Exports support FOCUS 1.0 format for vendor-neutral normalization.

---

*Integration will be built when Azure onboarding begins. The setup steps above can be run in advance to have credentials ready.*
