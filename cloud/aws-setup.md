# AWS Setup Guide — Nimbus FinOps Platform

> Pre-requisites and setup steps for connecting an AWS account to Nimbus.
> Follow this guide for each new client onboarding (e.g., PFL, ACC, etc.)

---

## 1. Overview

| What Nimbus Reads | AWS Service Used | Cost | IAM Permission |
|-------------------|-----------------|------|----------------|
| Cost data (MTD, trends, forecasts) | Cost Explorer API | ~$0.01/request | `ce:GetCostAndUsage`, `ce:GetCostForecast` |
| Account validation | STS | Free | `sts:GetCallerIdentity` |
| Resource inventory | Resource Explorer | Free | `resource-explorer-2:Search`, `GetView`, `ListResources` |
| Rightsizing recommendations | Compute Optimizer | Free | `compute-optimizer:Get*Recommendations` |
| Compliance/governance | AWS Config | ~$2-3/mo | `config:Describe*`, `config:Get*` |

**Total estimated AWS cost: ~$3-6/month** (mostly Config; without Config it's under $1/mo).

---

## 2. IAM User Setup

### 2.1 Create a dedicated IAM user

```bash
# Create the service account user (no console access)
aws iam create-user --user-name nimbus-finops-svc
```

### 2.2 Create access keys

```bash
aws iam create-access-key --user-name nimbus-finops-svc
```

Save the `AccessKeyId` and `SecretAccessKey` — these go into Nimbus as environment variables:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### 2.3 Attach read-only policies

Run all commands below in **AWS CloudShell** or any CLI with admin access:

#### Cost Explorer (Required — powers Dashboard, Cost Explorer, Budgets, Anomalies)

```bash
aws iam put-user-policy --user-name nimbus-finops-svc \
  --policy-name NimbusCostExplorer \
  --policy-document '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ce:GetCostAndUsage",
      "ce:GetCostForecast",
      "ce:GetDimensionValues",
      "ce:GetTags"
    ],
    "Resource": "*"
  }]
}'
```

#### STS (Required — account validation)

```bash
aws iam put-user-policy --user-name nimbus-finops-svc \
  --policy-name NimbusSTS \
  --policy-document '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["sts:GetCallerIdentity"],
    "Resource": "*"
  }]
}'
```

#### Resource Explorer (Required — powers Resources page)

```bash
aws iam put-user-policy --user-name nimbus-finops-svc \
  --policy-name NimbusResourceExplorer \
  --policy-document '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "resource-explorer-2:Search",
      "resource-explorer-2:GetView",
      "resource-explorer-2:ListResources"
    ],
    "Resource": "*"
  }]
}'
```

#### Compute Optimizer (Required — powers Recommendations page)

```bash
aws iam put-user-policy --user-name nimbus-finops-svc \
  --policy-name NimbusComputeOptimizer \
  --policy-document '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "compute-optimizer:GetEC2InstanceRecommendations",
      "compute-optimizer:GetAutoScalingGroupRecommendations",
      "compute-optimizer:GetLambdaFunctionRecommendations",
      "compute-optimizer:GetEBSVolumeRecommendations"
    ],
    "Resource": "*"
  }]
}'
```

#### AWS Config (Optional — powers Governance page, costs ~$2-3/mo)

```bash
aws iam put-user-policy --user-name nimbus-finops-svc \
  --policy-name NimbusConfig \
  --policy-document '{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "config:DescribeComplianceByConfigRule",
      "config:DescribeConfigRules",
      "config:GetComplianceDetailsByConfigRule",
      "config:DescribeConfigurationRecorderStatus"
    ],
    "Resource": "*"
  }]
}'
```

### 2.4 Verify policies are attached

```bash
aws iam list-user-policies --user-name nimbus-finops-svc
```

Expected output:
```json
{
    "PolicyNames": [
        "NimbusCostExplorer",
        "NimbusSTS",
        "NimbusResourceExplorer",
        "NimbusComputeOptimizer",
        "NimbusConfig"
    ]
}
```

---

## 3. Enable AWS Services

### 3.1 Cost Explorer (usually already enabled)

Cost Explorer is enabled by default on most accounts. If not:
1. Go to AWS Console → Billing → Cost Explorer
2. Click "Enable Cost Explorer"
3. Takes ~24 hours to populate data

### 3.2 Resource Explorer (Free)

```bash
# Creates a LOCAL index in the primary region
aws resource-explorer-2 create-index --region ap-south-1
```

> If you get `ConflictException: An index already exists`, it's already enabled — you're good.

For multi-region visibility, create an AGGREGATOR index:
```bash
# Optional: upgrade to aggregator for cross-region resource discovery
aws resource-explorer-2 update-index-type --arn <index-arn> --type AGGREGATOR --region ap-south-1
```

### 3.3 Compute Optimizer (Free)

1. Go to AWS Console → Compute Optimizer
2. Click "Opt in"
3. Or via CLI:
```bash
aws compute-optimizer update-enrollment-status --status Active --region ap-south-1
```

> **Note:** Compute Optimizer needs ~14 days of CloudWatch utilization data before it generates recommendations. During this period, the Recommendations page will show "collecting data".

### 3.4 AWS Config (Optional — ~$2-3/month)

Only needed for the Governance page (compliance rules, tagging enforcement).

```bash
# Step 1: Create a Config recorder
aws configservice put-configuration-recorder \
  --configuration-recorder name=default,roleARN=arn:aws:iam::<ACCOUNT_ID>:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig \
  --recording-group allSupported=true \
  --region ap-south-1

# Step 2: Create a delivery channel (requires an S3 bucket)
aws s3 mb s3://nimbus-config-<ACCOUNT_ID> --region ap-south-1

aws configservice put-delivery-channel \
  --delivery-channel name=default,s3BucketName=nimbus-config-<ACCOUNT_ID> \
  --region ap-south-1

# Step 3: Start the recorder
aws configservice start-configuration-recorder --configuration-recorder-name default --region ap-south-1
```

Replace `<ACCOUNT_ID>` with the actual AWS account ID (e.g., `766940073591`).

#### Add Config Rules (examples)

```bash
# Ensure S3 buckets are not public
aws configservice put-config-rule --config-rule '{
  "ConfigRuleName": "s3-bucket-public-read-prohibited",
  "Source": {"Owner": "AWS", "SourceIdentifier": "S3_BUCKET_PUBLIC_READ_PROHIBITED"}
}' --region ap-south-1

# Ensure EBS volumes are encrypted
aws configservice put-config-rule --config-rule '{
  "ConfigRuleName": "encrypted-volumes",
  "Source": {"Owner": "AWS", "SourceIdentifier": "ENCRYPTED_VOLUMES"}
}' --region ap-south-1

# Ensure required tags exist
aws configservice put-config-rule --config-rule '{
  "ConfigRuleName": "required-tags",
  "Source": {"Owner": "AWS", "SourceIdentifier": "REQUIRED_TAGS"},
  "InputParameters": "{\"tag1Key\":\"cost-center\",\"tag2Key\":\"environment\"}"
}' --region ap-south-1
```

---

## 4. Environment Variables

Set these in your deployment platform (Render, Vercel, Docker, etc.):

| Variable | Value | Required |
|----------|-------|----------|
| `AWS_ACCESS_KEY_ID` | From step 2.2 | Yes |
| `AWS_SECRET_ACCESS_KEY` | From step 2.2 | Yes |

The region is hardcoded in the application:
- Cost Explorer: `us-east-1` (AWS requirement)
- Resource Explorer: `ap-south-1` (where index is created)
- Compute Optimizer: `ap-south-1`
- Config: `ap-south-1`

For a different region, update the region values in `apps/web/src/lib/cloud/`:
- `aws-costs.ts` — Cost Explorer client (must stay `us-east-1`)
- `aws-resources.ts` — Resource Explorer client
- `aws-compute-optimizer.ts` — Compute Optimizer client
- `aws-config.ts` — Config client

---

## 5. Security Checklist

- [x] IAM user has **read-only** permissions only (no write/modify/delete)
- [x] No console access for the service account
- [x] Access keys stored as environment variables (not in code)
- [x] All API calls are server-side (Next.js Server Components) — credentials never reach browser
- [x] No public S3 buckets created
- [x] No security groups modified
- [x] No VPCs or ports opened
- [x] No data leaves the AWS account — Nimbus only reads
- [x] 5-15 minute in-memory caching reduces API call volume

---

## 6. Nimbus Feature → AWS Service Mapping

| Nimbus Page | AWS Service | Data Source | Cache TTL |
|-------------|------------|-------------|-----------|
| Dashboard | Cost Explorer | `GetCostAndUsage`, `GetCostForecast` | 5 min |
| Cost Explorer | Cost Explorer | `GetCostAndUsage` (by service) | 5 min |
| Budgets | Cost Explorer | Derived from forecast data | 5 min |
| Anomalies | Cost Explorer | MoM service cost changes | 5 min |
| Resources | Resource Explorer | `Search` (all resources) | 10 min |
| Recommendations | Compute Optimizer | `GetEC2/Lambda/EBS/ASG Recommendations` | 15 min |
| Governance | AWS Config | `DescribeConfigRules`, `DescribeCompliance` | 10 min |
| Cloud Accounts | STS | `GetCallerIdentity` | 5 min |

---

## 7. Troubleshooting

### "Live data unavailable" on Dashboard
- Check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set correctly
- Verify credentials: `aws sts get-caller-identity --access-key <KEY> --secret-key <SECRET>`
- Ensure Cost Explorer is enabled (Billing Console → Cost Explorer)

### Resources page shows "No resource data"
- Verify Resource Explorer index exists: `aws resource-explorer-2 list-indexes --region ap-south-1`
- Verify IAM policy: `aws iam get-user-policy --user-name nimbus-finops-svc --policy-name NimbusResourceExplorer`

### Recommendations shows "Collecting data"
- Compute Optimizer needs ~14 days of CloudWatch metrics
- Verify enrollment: `aws compute-optimizer get-enrollment-status`

### Governance shows "Setup Required"
- AWS Config needs to be enabled (see section 3.4)
- Config rules need to be added manually from AWS Console or CLI
- Verify recorder: `aws configservice describe-configuration-recorder-status`

---

## 8. Cost Optimization Tips

1. **Don't enable AWS Config** unless the client specifically needs governance/compliance. It's the only paid service (~$2-3/mo).
2. **Caching** — Nimbus caches all API responses (5-15 min). This means ~300-500 API calls/month instead of thousands.
3. **Config rules** — Use only the rules you need. Each rule evaluation costs $0.001. Start with 5-10 rules max.
4. **Resource Explorer** — Completely free, no limits. Safe to enable everywhere.
5. **Compute Optimizer** — Completely free. Enable it immediately on every account.

---

## ACC Digitalization Account — Current Setup

| Item | Value |
|------|-------|
| AWS Account ID | `766940073591` |
| IAM User | `nimbus-finops-svc` |
| Region | `ap-south-1` (Mumbai) |
| Resource Explorer | ✅ Enabled (LOCAL index) |
| Compute Optimizer | ✅ Enabled (collecting data) |
| AWS Config | Pending (optional) |
| Cost Explorer | ✅ Enabled |
| Deployment | Render (free tier) via `pradnyaag30/nimbus` |
