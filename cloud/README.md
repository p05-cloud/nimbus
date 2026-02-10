# Cloud Provider Setup — Nimbus FinOps Platform

This folder contains setup guides for connecting cloud provider accounts to Nimbus.
Use these guides when onboarding new clients (PFL, ACC, etc.).

## Available Guides

| Provider | Guide | Status | Cost |
|----------|-------|--------|------|
| **AWS** | [aws-setup.md](./aws-setup.md) | ✅ Live | ~$3-6/mo |
| **Azure** | [azure-setup.md](./azure-setup.md) | 🔜 Planned | TBD |
| **GCP** | [gcp-setup.md](./gcp-setup.md) | 🔜 Planned | TBD |
| **Oracle Cloud** | [oci-setup.md](./oci-setup.md) | 🔜 Planned | TBD |

## Quick Reference — What Each Provider Needs

### AWS (Live)
1. Create IAM user with read-only policies
2. Enable Resource Explorer (free)
3. Enable Compute Optimizer (free)
4. Optionally enable AWS Config (~$2-3/mo)
5. Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` env vars

### Azure (Planned)
1. Create App Registration in Azure AD
2. Assign Cost Management Reader role
3. Enable Azure Advisor (free)
4. Set `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` env vars

### GCP (Planned)
1. Create Service Account with Billing Viewer role
2. Enable BigQuery billing export
3. Set `GCP_SERVICE_ACCOUNT_JSON` env var

### Oracle Cloud (Planned)
1. Create API key in OCI Console
2. Assign Cost Analysis policies
3. Set OCI credentials env vars

## Security Principles

All cloud integrations follow these rules:

- **Read-only access** — Nimbus never modifies, creates, or deletes cloud resources
- **Minimal permissions** — Only the specific API calls needed, nothing more
- **Server-side only** — Credentials are used in Next.js Server Components, never exposed to the browser
- **Env var storage** — Credentials stored as environment variables, never in code or git
- **Caching** — All API responses cached 5-15 minutes to minimize API calls and costs
