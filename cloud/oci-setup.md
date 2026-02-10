# Oracle Cloud Infrastructure (OCI) Setup Guide — Nimbus FinOps Platform

> Setup steps for connecting an Oracle Cloud tenancy to Nimbus.

**Status:** 🔜 Planned — Integration not yet built.

---

## Planned Architecture

| What Nimbus Will Read | OCI Service | Cost |
|----------------------|-------------|------|
| Cost data | OCI Cost Analysis API | Free |
| Resource inventory | OCI Search (Resource Query) | Free |
| Rightsizing recommendations | OCI Cloud Advisor | Free |
| Compliance | OCI Cloud Guard | Free |

## Pre-requisites (for when integration is built)

1. **API Key** in OCI Console:
   - Create a user or use an existing service user
   - Generate an API signing key pair
   - Add the public key to the user

2. **IAM Policies:**
   - `Allow group NimbusGroup to read usage-reports in tenancy`
   - `Allow group NimbusGroup to read all-resources in tenancy`
   - `Allow group NimbusGroup to read cloud-advisor-recommendations in tenancy`

3. **Environment Variables:**
   - `OCI_TENANCY_OCID`
   - `OCI_USER_OCID`
   - `OCI_FINGERPRINT`
   - `OCI_PRIVATE_KEY` (base64-encoded PEM key)
   - `OCI_REGION`

---

*This guide will be completed when OCI integration is built.*
