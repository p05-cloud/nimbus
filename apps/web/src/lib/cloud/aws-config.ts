import {
  ConfigServiceClient,
  DescribeComplianceByConfigRuleCommand,
  DescribeConfigRulesCommand,
  GetComplianceDetailsByConfigRuleCommand,
  DescribeConfigurationRecorderStatusCommand,
  type ComplianceByConfigRule,
  type ConfigRule,
} from '@aws-sdk/client-config-service';

// --- Types -------------------------------------------------------------------

export interface ComplianceRule {
  ruleName: string;
  description: string;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE' | 'INSUFFICIENT_DATA';
  compliantCount: number;
  nonCompliantCount: number;
  source: string;
}

export interface GovernanceSummary {
  configRecorderActive: boolean;
  rules: ComplianceRule[];
  totalCompliant: number;
  totalNonCompliant: number;
  compliancePercentage: number;
  status: 'active' | 'not-enabled' | 'error';
  errorMessage?: string;
}

// --- Client Factory ----------------------------------------------------------

function createClient(): ConfigServiceClient {
  return new ConfigServiceClient({
    region: 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// --- Cache -------------------------------------------------------------------

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (testing mode)
let cachedData: GovernanceSummary | null = null;
let cachedAt = 0;

// --- Main Fetch Function -----------------------------------------------------

export async function fetchAwsConfigCompliance(): Promise<GovernanceSummary> {
  if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedData;
  }

  const client = createClient();

  try {
    // First, check if Config recorder is active
    const recorderStatus = await client.send(new DescribeConfigurationRecorderStatusCommand({}));
    const recorders = recorderStatus.ConfigurationRecordersStatus || [];
    const isRecording = recorders.some((r) => r.recording === true);

    if (!isRecording || recorders.length === 0) {
      return {
        configRecorderActive: false,
        rules: [],
        totalCompliant: 0,
        totalNonCompliant: 0,
        compliancePercentage: 0,
        status: 'not-enabled',
        errorMessage: 'AWS Config recorder is not active. Enable it to get compliance data.',
      };
    }

    // Fetch config rules and compliance in parallel
    const [rulesRes, complianceRes] = await Promise.all([
      client.send(new DescribeConfigRulesCommand({})),
      client.send(new DescribeComplianceByConfigRuleCommand({})),
    ]);

    const configRules = rulesRes.ConfigRules || [];
    const complianceList = complianceRes.ComplianceByConfigRules || [];

    // Build a map of rule name → compliance
    const complianceMap = new Map<string, ComplianceByConfigRule>();
    for (const c of complianceList) {
      if (c.ConfigRuleName) {
        complianceMap.set(c.ConfigRuleName, c);
      }
    }

    // Build rules with compliance detail
    const rules: ComplianceRule[] = [];

    for (const rule of configRules) {
      const ruleName = rule.ConfigRuleName || 'Unknown';
      const compliance = complianceMap.get(ruleName);
      const complianceStatus = (compliance?.Compliance?.ComplianceType || 'INSUFFICIENT_DATA') as ComplianceRule['complianceStatus'];

      // Try to get counts
      let compliantCount = 0;
      let nonCompliantCount = 0;

      if (compliance?.Compliance?.ComplianceContributorCount) {
        compliantCount = compliance.Compliance.ComplianceContributorCount.CappedCount || 0;
      }

      // For non-compliant, the contributor count is in the compliance type
      if (complianceStatus === 'NON_COMPLIANT' && compliance?.Compliance?.ComplianceContributorCount) {
        nonCompliantCount = compliance.Compliance.ComplianceContributorCount.CappedCount || 0;
        compliantCount = 0; // The count is for non-compliant resources
      } else if (complianceStatus === 'COMPLIANT') {
        nonCompliantCount = 0;
      }

      rules.push({
        ruleName,
        description: rule.Description || ruleDescription(ruleName),
        complianceStatus,
        compliantCount,
        nonCompliantCount,
        source: rule.Source?.Owner === 'AWS' ? 'AWS Managed' : 'Custom',
      });
    }

    // Sort: non-compliant first, then compliant
    rules.sort((a, b) => {
      if (a.complianceStatus === 'NON_COMPLIANT' && b.complianceStatus !== 'NON_COMPLIANT') return -1;
      if (a.complianceStatus !== 'NON_COMPLIANT' && b.complianceStatus === 'NON_COMPLIANT') return 1;
      return a.ruleName.localeCompare(b.ruleName);
    });

    const totalCompliant = rules.filter((r) => r.complianceStatus === 'COMPLIANT').length;
    const totalNonCompliant = rules.filter((r) => r.complianceStatus === 'NON_COMPLIANT').length;
    const evaluated = totalCompliant + totalNonCompliant;
    const compliancePercentage = evaluated > 0 ? (totalCompliant / evaluated) * 100 : 0;

    const summary: GovernanceSummary = {
      configRecorderActive: true,
      rules,
      totalCompliant,
      totalNonCompliant,
      compliancePercentage,
      status: 'active',
    };

    cachedData = summary;
    cachedAt = Date.now();
    return summary;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';

    // Handle "recorder not found" gracefully
    if (msg.includes('NoSuchConfigurationRecorderException') || msg.includes('No configuration recorder')) {
      return {
        configRecorderActive: false,
        rules: [],
        totalCompliant: 0,
        totalNonCompliant: 0,
        compliancePercentage: 0,
        status: 'not-enabled',
        errorMessage: 'AWS Config is not enabled in this region.',
      };
    }

    return {
      configRecorderActive: false,
      rules: [],
      totalCompliant: 0,
      totalNonCompliant: 0,
      compliancePercentage: 0,
      status: 'error',
      errorMessage: msg,
    };
  }
}

// --- Non-Compliant Resource Drill-Down ----------------------------------------

export interface NonCompliantResource {
  resourceId: string;
  resourceType: string;
  complianceType: string;
}

export async function fetchNonCompliantResources(
  ruleName: string,
): Promise<NonCompliantResource[]> {
  const client = createClient();

  try {
    const response = await client.send(
      new GetComplianceDetailsByConfigRuleCommand({
        ConfigRuleName: ruleName,
        ComplianceTypes: ['NON_COMPLIANT'],
        Limit: 100,
      }),
    );

    const results = response.EvaluationResults || [];
    return results.map((r) => ({
      resourceId: r.EvaluationResultIdentifier?.EvaluationResultQualifier?.ResourceId || 'unknown',
      resourceType: r.EvaluationResultIdentifier?.EvaluationResultQualifier?.ResourceType || 'unknown',
      complianceType: r.ComplianceType || 'NON_COMPLIANT',
    }));
  } catch (error) {
    console.error(`[Governance] Failed to fetch non-compliant resources for ${ruleName}:`, error);
    return [];
  }
}

// --- Helper: Friendly rule descriptions for AWS managed rules ----------------

function ruleDescription(ruleName: string): string {
  const descriptions: Record<string, string> = {
    's3-bucket-public-read-prohibited': 'Ensures S3 buckets do not allow public read access',
    's3-bucket-public-write-prohibited': 'Ensures S3 buckets do not allow public write access',
    's3-bucket-server-side-encryption-enabled': 'Ensures S3 buckets have encryption at rest enabled',
    'encrypted-volumes': 'Ensures EBS volumes are encrypted at rest',
    'rds-storage-encrypted': 'Ensures RDS instances have storage encryption enabled',
    'iam-password-policy': 'Ensures IAM password policy meets security requirements',
    'iam-root-access-key-check': 'Ensures root account does not have access keys',
    'required-tags': 'Ensures resources have required tags (cost-center, environment, team)',
    'ec2-instance-no-public-ip': 'Ensures EC2 instances do not have public IP addresses',
    'restricted-ssh': 'Ensures security groups do not allow unrestricted SSH access',
    'cloudtrail-enabled': 'Ensures CloudTrail is enabled for API logging',
    'multi-region-cloudtrail-enabled': 'Ensures CloudTrail is enabled in all regions',
  };
  return descriptions[ruleName] || `Config rule: ${ruleName}`;
}
