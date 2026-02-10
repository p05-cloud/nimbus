#!/bin/bash
# =============================================================================
# Nimbus FinOps — AWS Pre-requisite Setup Script
# Run this in AWS CloudShell for Account: 766940073591
# =============================================================================
# This script creates:
#   1. S3 bucket for CUR reports
#   2. IAM policy with least-privilege permissions
#   3. IAM role (cross-account) OR IAM user for Nimbus
#   4. Enables Cost & Usage Report (daily, Parquet, GZIP)
# =============================================================================

set -euo pipefail

# --- Configuration -----------------------------------------------------------
AWS_ACCOUNT_ID="766940073591"
AWS_REGION="ap-south-1"                          # Mumbai — data residency for PFL
CUR_BUCKET_NAME="nimbus-cur-${AWS_ACCOUNT_ID}"
CUR_REPORT_NAME="nimbus-daily-cur"
IAM_POLICY_NAME="NimbusFinOpsReadOnly"
IAM_ROLE_NAME="NimbusFinOpsRole"
IAM_USER_NAME="nimbus-finops-svc"
NIMBUS_EXTERNAL_ID="nimbus-pfl-$(date +%s)"      # Unique external ID for role assumption

echo "============================================="
echo "  Nimbus FinOps — AWS Setup"
echo "  Account: ${AWS_ACCOUNT_ID}"
echo "  Region:  ${AWS_REGION}"
echo "============================================="
echo ""

# --- Step 1: Create S3 Bucket for CUR ----------------------------------------
echo "[1/6] Creating S3 bucket for Cost & Usage Reports..."

aws s3api create-bucket \
  --bucket "${CUR_BUCKET_NAME}" \
  --region "${AWS_REGION}" \
  --create-bucket-configuration LocationConstraint="${AWS_REGION}" \
  2>/dev/null || echo "  ↳ Bucket already exists, skipping."

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket "${CUR_BUCKET_NAME}" \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket "${CUR_BUCKET_NAME}" \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'

# Bucket policy to allow CUR delivery
cat > /tmp/cur-bucket-policy.json << POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCURDelivery",
      "Effect": "Allow",
      "Principal": {
        "Service": "billingreports.amazonaws.com"
      },
      "Action": [
        "s3:GetBucketAcl",
        "s3:GetBucketPolicy"
      ],
      "Resource": "arn:aws:s3:::${CUR_BUCKET_NAME}",
      "Condition": {
        "StringEquals": {
          "aws:SourceArn": "arn:aws:cur:us-east-1:${AWS_ACCOUNT_ID}:definition/*",
          "aws:SourceAccount": "${AWS_ACCOUNT_ID}"
        }
      }
    },
    {
      "Sid": "AllowCURWrite",
      "Effect": "Allow",
      "Principal": {
        "Service": "billingreports.amazonaws.com"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::${CUR_BUCKET_NAME}/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceArn": "arn:aws:cur:us-east-1:${AWS_ACCOUNT_ID}:definition/*",
          "aws:SourceAccount": "${AWS_ACCOUNT_ID}"
        }
      }
    }
  ]
}
POLICY

aws s3api put-bucket-policy \
  --bucket "${CUR_BUCKET_NAME}" \
  --policy file:///tmp/cur-bucket-policy.json

echo "  ✅ S3 bucket '${CUR_BUCKET_NAME}' ready."
echo ""

# --- Step 2: Create IAM Policy ------------------------------------------------
echo "[2/6] Creating IAM policy '${IAM_POLICY_NAME}'..."

cat > /tmp/nimbus-policy.json << 'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CostExplorerRead",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostAndUsageWithResources",
        "ce:GetCostForecast",
        "ce:GetTags",
        "ce:GetCostCategories",
        "ce:GetDimensionValues",
        "ce:GetReservationUtilization",
        "ce:GetReservationPurchaseRecommendation",
        "ce:GetRightsizingRecommendation",
        "ce:GetSavingsPlansPurchaseRecommendation",
        "ce:GetSavingsPlansUtilization",
        "ce:GetAnomalies",
        "ce:GetAnomalyMonitors",
        "ce:GetAnomalySubscriptions"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CURRead",
      "Effect": "Allow",
      "Action": [
        "cur:DescribeReportDefinitions",
        "cur:GetUsageReport"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CURBucketRead",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::nimbus-cur-766940073591",
        "arn:aws:s3:::nimbus-cur-766940073591/*"
      ]
    },
    {
      "Sid": "CredentialValidation",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    },
    {
      "Sid": "OrganizationRead",
      "Effect": "Allow",
      "Action": [
        "organizations:ListAccounts",
        "organizations:DescribeOrganization",
        "organizations:DescribeAccount"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ResourceInventory",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeVolumes",
        "ec2:DescribeSnapshots",
        "ec2:DescribeAddresses",
        "ec2:DescribeNatGateways",
        "ec2:DescribeLoadBalancers",
        "rds:DescribeDBInstances",
        "rds:DescribeDBClusters",
        "s3:ListAllMyBuckets",
        "s3:GetBucketLocation",
        "s3:GetBucketTagging",
        "lambda:ListFunctions",
        "lambda:GetFunction",
        "ecs:ListClusters",
        "ecs:DescribeClusters",
        "eks:ListClusters",
        "eks:DescribeCluster",
        "elasticache:DescribeCacheClusters",
        "es:ListDomainNames",
        "es:DescribeDomains",
        "tag:GetResources",
        "tag:GetTagKeys",
        "tag:GetTagValues"
      ],
      "Resource": "*"
    },
    {
      "Sid": "OptimizationRecommendations",
      "Effect": "Allow",
      "Action": [
        "compute-optimizer:GetEC2InstanceRecommendations",
        "compute-optimizer:GetAutoScalingGroupRecommendations",
        "compute-optimizer:GetEBSVolumeRecommendations",
        "compute-optimizer:GetLambdaFunctionRecommendations",
        "compute-optimizer:GetEnrollmentStatus",
        "trustedadvisor:Describe*",
        "trustedadvisor:Refresh*",
        "support:DescribeTrustedAdvisorChecks",
        "support:DescribeTrustedAdvisorCheckResult"
      ],
      "Resource": "*"
    },
    {
      "Sid": "BudgetRead",
      "Effect": "Allow",
      "Action": [
        "budgets:ViewBudget",
        "budgets:DescribeBudgets"
      ],
      "Resource": "*"
    }
  ]
}
POLICY

POLICY_ARN=$(aws iam create-policy \
  --policy-name "${IAM_POLICY_NAME}" \
  --policy-document file:///tmp/nimbus-policy.json \
  --description "Read-only access for Nimbus FinOps Platform — cost data, resources, recommendations" \
  --query 'Policy.Arn' --output text 2>/dev/null) || {
  POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${IAM_POLICY_NAME}"
  echo "  ↳ Policy already exists, using existing."
}

echo "  ✅ IAM Policy: ${POLICY_ARN}"
echo ""

# --- Step 3: Create IAM User (for Access Key auth) ---------------------------
echo "[3/6] Creating IAM user '${IAM_USER_NAME}'..."

aws iam create-user \
  --user-name "${IAM_USER_NAME}" \
  --tags Key=Purpose,Value=NimbusFinOps Key=ManagedBy,Value=NimbusSetup \
  2>/dev/null || echo "  ↳ User already exists, skipping."

aws iam attach-user-policy \
  --user-name "${IAM_USER_NAME}" \
  --policy-arn "${POLICY_ARN}" \
  2>/dev/null || echo "  ↳ Policy already attached."

echo "  ✅ IAM User '${IAM_USER_NAME}' ready."
echo ""

# --- Step 4: Generate Access Keys ---------------------------------------------
echo "[4/6] Generating access keys..."

KEYS=$(aws iam create-access-key \
  --user-name "${IAM_USER_NAME}" \
  --query 'AccessKey.[AccessKeyId,SecretAccessKey]' \
  --output text 2>/dev/null) || {
  echo "  ⚠️  Could not create keys (max 2 keys per user). Delete old keys first:"
  echo "     aws iam list-access-keys --user-name ${IAM_USER_NAME}"
  echo "     aws iam delete-access-key --user-name ${IAM_USER_NAME} --access-key-id <KEY_ID>"
  KEYS=""
}

if [ -n "${KEYS}" ]; then
  ACCESS_KEY_ID=$(echo "${KEYS}" | awk '{print $1}')
  SECRET_ACCESS_KEY=$(echo "${KEYS}" | awk '{print $2}')

  echo ""
  echo "  ┌─────────────────────────────────────────────────────────┐"
  echo "  │  🔑 SAVE THESE CREDENTIALS — SHOWN ONLY ONCE!          │"
  echo "  ├─────────────────────────────────────────────────────────┤"
  echo "  │  Access Key ID:     ${ACCESS_KEY_ID}"
  echo "  │  Secret Access Key: ${SECRET_ACCESS_KEY}"
  echo "  │  AWS Account ID:    ${AWS_ACCOUNT_ID}"
  echo "  └─────────────────────────────────────────────────────────┘"
  echo ""
fi

# --- Step 5: Enable Cost & Usage Report --------------------------------------
echo "[5/6] Creating Cost & Usage Report (CUR)..."
echo "  ↳ Report: ${CUR_REPORT_NAME}"
echo "  ↳ Bucket: ${CUR_BUCKET_NAME}"
echo "  ↳ Format: Parquet + GZIP, Daily granularity"

# CUR API is only available in us-east-1
aws cur put-report-definition \
  --region us-east-1 \
  --report-definition '{
    "ReportName": "'"${CUR_REPORT_NAME}"'",
    "TimeUnit": "DAILY",
    "Format": "Parquet",
    "Compression": "Parquet",
    "AdditionalSchemaElements": ["RESOURCES", "SPLIT_COST_ALLOCATION_DATA"],
    "S3Bucket": "'"${CUR_BUCKET_NAME}"'",
    "S3Prefix": "cur-data",
    "S3Region": "'"${AWS_REGION}"'",
    "AdditionalArtifacts": ["ATHENA"],
    "RefreshClosedReports": true,
    "ReportVersioning": "OVERWRITE_REPORT"
  }' 2>/dev/null && echo "  ✅ CUR report created." || {
  echo "  ⚠️  CUR creation via CLI may require the new BCM Data Exports API."
  echo "  ↳ Trying BCM Data Exports API instead..."

  # Fallback: Use the newer BCM Data Exports API
  aws bcm-data-exports create-export \
    --region us-east-1 \
    --export '{
      "Name": "'"${CUR_REPORT_NAME}"'",
      "DataQuery": {
        "QueryStatement": "SELECT identity_line_item_id, identity_time_interval, bill_invoice_id, bill_invoicing_entity, bill_billing_entity, bill_bill_type, bill_payer_account_id, bill_billing_period_start_date, bill_billing_period_end_date, line_item_usage_account_id, line_item_line_item_type, line_item_usage_start_date, line_item_usage_end_date, line_item_product_code, line_item_usage_type, line_item_operation, line_item_availability_zone, line_item_resource_id, line_item_usage_amount, line_item_normalization_factor, line_item_normalized_usage_amount, line_item_currency_code, line_item_unblended_rate, line_item_unblended_cost, line_item_blended_rate, line_item_blended_cost, line_item_net_unblended_rate, line_item_net_unblended_cost, product_product_name, product_instance_type, product_region, pricing_term, pricing_unit, resource_tags",
        "TableConfigurations": {
          "COST_AND_USAGE_REPORT": {
            "TIME_GRANULARITY": "DAILY",
            "INCLUDE_RESOURCES": "TRUE",
            "INCLUDE_SPLIT_COST_ALLOCATION_DATA": "TRUE"
          }
        }
      },
      "DestinationConfigurations": {
        "S3Destination": {
          "S3Bucket": "'"${CUR_BUCKET_NAME}"'",
          "S3Prefix": "cur-data",
          "S3Region": "'"${AWS_REGION}"'",
          "S3OutputConfigurations": {
            "OutputType": "CUSTOM",
            "Format": "PARQUET",
            "Compression": "PARQUET",
            "Overwrite": "OVERWRITE_REPORT"
          }
        }
      },
      "RefreshCadence": {
        "Frequency": "SYNCHRONOUS"
      }
    }' 2>/dev/null && echo "  ✅ BCM Data Export created." || {
    echo ""
    echo "  ⚠️  Automated CUR setup failed. Please create manually:"
    echo "     1. Go to: https://us-east-1.console.aws.amazon.com/billing/home#/reports"
    echo "     2. Click 'Create report'"
    echo "     3. Report name: ${CUR_REPORT_NAME}"
    echo "     4. Time granularity: Hourly"
    echo "     5. Include: Resource IDs"
    echo "     6. Data format: Apache Parquet"
    echo "     7. S3 bucket: ${CUR_BUCKET_NAME}"
    echo "     8. S3 prefix: cur-data"
    echo "     9. Report versioning: Overwrite existing"
    echo ""
  }
}

# --- Step 6: Enable Compute Optimizer (for recommendations) -------------------
echo ""
echo "[6/6] Enabling AWS Compute Optimizer..."

aws compute-optimizer update-enrollment-status \
  --status Active \
  --region "${AWS_REGION}" \
  2>/dev/null && echo "  ✅ Compute Optimizer enabled." || \
  echo "  ↳ Compute Optimizer may already be active or requires org-level access."

# --- Summary ------------------------------------------------------------------
echo ""
echo "============================================="
echo "  ✅ AWS Setup Complete!"
echo "============================================="
echo ""
echo "  Resources Created:"
echo "  ─────────────────────────────────────────"
echo "  S3 Bucket:      ${CUR_BUCKET_NAME}"
echo "  IAM Policy:     ${IAM_POLICY_NAME}"
echo "  IAM User:       ${IAM_USER_NAME}"
echo "  CUR Report:     ${CUR_REPORT_NAME}"
echo "  Account ID:     ${AWS_ACCOUNT_ID}"
echo ""
echo "  ⚠️  IMPORTANT NOTES:"
echo "  ─────────────────────────────────────────"
echo "  1. CUR data takes 24-48 hours to start appearing in S3"
echo "  2. Cost Explorer API has data available within a few hours"
echo "  3. Save the access keys above — they are shown only once"
echo "  4. Enter these credentials in Nimbus → Dashboard → Cloud Accounts → Add AWS"
echo ""
echo "  📊 Meanwhile, Cost Explorer API will provide:"
echo "     - Last 12 months of cost data (immediate)"
echo "     - Daily/monthly aggregated costs"
echo "     - Service-level breakdown"
echo "     - Tag-based allocation"
echo ""
echo "  📋 To verify CUR setup later:"
echo "     aws cur describe-report-definitions --region us-east-1"
echo "     aws s3 ls s3://${CUR_BUCKET_NAME}/cur-data/ --recursive"
echo ""
