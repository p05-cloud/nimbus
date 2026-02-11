# AWS Setup Guide — Nimbus FinOps Platform

> Pre-requisites and setup steps for connecting AWS accounts to Nimbus.
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

**Total estimated AWS cost: ~$5-25/month** for multi-account (mostly Cost Explorer API calls + Config).

---

## 1.1 Multi-Account Architecture

Most enterprise clients (like PFL) use **AWS Organizations** with multiple accounts:

```
AWS Organizations (Management/Payer Account)
├── OU: Production
│   ├── Account: Client-Prod (workloads)
│   ├── Account: Client-Prod-Data (databases)
│   └── Account: Client-DR (disaster recovery)
├── OU: Non-Production
│   ├── Account: Client-Dev
│   ├── Account: Client-Staging
│   └── Account: Client-QA
├── OU: Security
│   └── Account: Client-Security (CloudTrail, GuardDuty)
└── OU: Shared Services
    └── Account: Client-Shared (networking, DNS)
```

### Key Principle: 1 Credential = All Accounts

**The Cost Explorer API called from the management (payer) account automatically sees ALL linked member accounts.** No need to create IAM users/roles in every account.

```
Management Account credential → Cost Explorer API → sees all 10-50+ accounts
```

The only difference in the API call is adding a `GroupBy` dimension:
```
GroupBy: [{ Type: "DIMENSION", Key: "LINKED_ACCOUNT" }]
```

### Three Approaches to Multi-Account Cost Data

| Approach | Best For | Credentials | Granularity |
|----------|---------|-------------|-------------|
| **Cost Explorer API (current)** | Real-time dashboards, <50 accounts | 1 (management account) | Service-level, daily |
| **CUR 2.0 (S3 export)** | Deep analytics, >50 accounts | 1 (management account) | Resource-level line items |
| **Cross-account IAM roles** | Resource-level APIs (CloudWatch, tags) | 1 per account | Instance-level metrics |

**Nimbus currently uses Approach 1.** For PFL at scale, we'll add CUR 2.0 ingestion.

### For Multi-Account Setup

Create the IAM user in the **management (payer) account**, not in individual member accounts. The Cost Explorer API will automatically aggregate all linked accounts.

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

## 8. Multi-Account Setup (AWS Organizations)

If the client uses AWS Organizations with multiple linked accounts:

### 8.1 Where to Create the IAM User

**Always create in the management (payer) account.** This is the account that owns the AWS Organization and receives the consolidated bill.

To identify the management account:
```bash
aws organizations describe-organization --query 'Organization.MasterAccountId'
```

### 8.2 Cost Explorer — Multi-Account Queries

The same Cost Explorer API permissions work for all linked accounts. To break down costs per account:

```bash
# Get cost by linked account
aws ce get-cost-and-usage \
  --time-period Start=2025-02-01,End=2025-02-28 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=LINKED_ACCOUNT
```

### 8.3 Resource Explorer — Multi-Account

Resource Explorer is per-account. For multi-account resource visibility:

**Option A: Aggregator index (recommended)**
1. Enable Resource Explorer in each member account
2. Create an AGGREGATOR index in one account (e.g., management account)
3. This aggregates resources from all accounts in the Organization

```bash
# In management account — create aggregator
aws resource-explorer-2 create-index --type AGGREGATOR --region ap-south-1

# In each member account — create local index
aws resource-explorer-2 create-index --type LOCAL --region ap-south-1
```

**Option B: Cross-account IAM roles**
Deploy a `NimbusReadOnly` role in each member account via CloudFormation StackSets, then assume-role into each account.

### 8.4 Compute Optimizer — Multi-Account

Enable Compute Optimizer at the Organization level from the management account:

```bash
# Opt in the entire organization
aws compute-optimizer update-enrollment-status \
  --status Active \
  --include-member-accounts
```

Then use organization-level API calls:
```bash
aws compute-optimizer get-ec2-instance-recommendations \
  --account-ids 111111111111 222222222222 333333333333
```

### 8.5 AWS Config — Multi-Account

Use AWS Config Aggregator for multi-account compliance:

```bash
# Create an aggregator in the management account
aws configservice put-configuration-aggregator \
  --configuration-aggregator-name NimbusAggregator \
  --organization-aggregation-source RoleArn=arn:aws:iam::<MGMT_ACCOUNT>:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig,AllAwsRegions=true
```

### 8.6 CUR 2.0 (For Scale — Optional)

For clients with 50+ accounts or need resource-level line items, enable CUR 2.0:

```bash
# Enable CUR 2.0 export to S3 (from management account)
aws bcm-data-exports create-export \
  --export '{
    "Name": "nimbus-cur",
    "DataQuery": {
      "QueryStatement": "SELECT * FROM COST_AND_USAGE_REPORT",
      "TableConfigurations": {
        "COST_AND_USAGE_REPORT": {
          "TIME_GRANULARITY": "DAILY",
          "INCLUDE_RESOURCES": "TRUE"
        }
      }
    },
    "DestinationConfigurations": {
      "S3Destination": {
        "S3Bucket": "nimbus-cur-<ACCOUNT_ID>",
        "S3Region": "ap-south-1",
        "S3OutputConfigurations": {
          "OutputType": "CUSTOM",
          "Format": "PARQUET",
          "Compression": "PARQUET",
          "Overwrite": "OVERWRITE_REPORT"
        }
      }
    },
    "RefreshCadence": {"Frequency": "SYNCHRONOUS"}
  }'
```

CUR 2.0 supports FOCUS schema natively and includes resource-level data for all linked accounts.

**Cost:** Free (only S3 storage ~$0.02/GB/month, typically 1-10 GB for 10-50 accounts).

---

## 9. Cost Optimization Tips

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
