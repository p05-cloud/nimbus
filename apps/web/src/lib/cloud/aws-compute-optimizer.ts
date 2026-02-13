import {
  ComputeOptimizerClient,
  GetEC2InstanceRecommendationsCommand,
  GetAutoScalingGroupRecommendationsCommand,
  GetLambdaFunctionRecommendationsCommand,
  GetEBSVolumeRecommendationsCommand,
  type InstanceRecommendation,
  type AutoScalingGroupRecommendation,
  type LambdaFunctionRecommendation,
  type VolumeRecommendation,
} from '@aws-sdk/client-compute-optimizer';

// --- Types -------------------------------------------------------------------

export interface OptimizationRecommendation {
  resourceId: string;
  resourceType: 'EC2' | 'AutoScaling' | 'Lambda' | 'EBS';
  finding: string;
  currentConfig: string;
  recommendedConfig: string;
  estimatedMonthlySavings: number;
  estimatedSavingsPercentage: number;
  risk: 'VeryLow' | 'Low' | 'Medium' | 'High';
  region: string;
}

export interface ComputeOptimizerSummary {
  recommendations: OptimizationRecommendation[];
  totalEstimatedSavings: number;
  byType: { type: string; count: number; savings: number }[];
  optimizerStatus: 'active' | 'collecting' | 'not-enrolled' | 'error';
  errorMessage?: string;
}

// --- Client Factory ----------------------------------------------------------

function createClient(): ComputeOptimizerClient {
  return new ComputeOptimizerClient({
    region: 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

// --- Helpers -----------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSavings(option: any): number {
  return option?.estimatedMonthlySavings?.value ?? option?.savingsOpportunity?.estimatedMonthlySavings?.value ?? 0;
}

function mapEC2(r: InstanceRecommendation): OptimizationRecommendation | null {
  if (String(r.finding) === 'Optimized') return null;
  const bestOption = r.recommendationOptions?.[0];
  const savings = extractSavings(bestOption);
  const currentCost = savings > 0 ? savings : 0;

  return {
    resourceId: r.instanceArn?.split('/').pop() || r.instanceArn || '',
    resourceType: 'EC2',
    finding: String(r.finding || 'Unknown'),
    currentConfig: `${r.currentInstanceType || 'Unknown'}`,
    recommendedConfig: bestOption?.instanceType || 'N/A',
    estimatedMonthlySavings: savings,
    estimatedSavingsPercentage: currentCost > 0 ? (savings / currentCost) * 100 : 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    risk: mapRisk((bestOption as any)?.migrationEffort),
    region: r.instanceArn?.split(':')[3] || 'ap-south-1',
  };
}

function mapAutoScaling(r: AutoScalingGroupRecommendation): OptimizationRecommendation | null {
  if (String(r.finding) === 'Optimized') return null;
  const bestOption = r.recommendationOptions?.[0];
  const savings = extractSavings(bestOption);

  return {
    resourceId: r.autoScalingGroupName || '',
    resourceType: 'AutoScaling',
    finding: String(r.finding || 'Unknown'),
    currentConfig: r.currentConfiguration?.instanceType || 'Unknown',
    recommendedConfig: bestOption?.configuration?.instanceType || 'N/A',
    estimatedMonthlySavings: savings,
    estimatedSavingsPercentage: 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    risk: mapRisk((bestOption as any)?.migrationEffort),
    region: r.autoScalingGroupArn?.split(':')[3] || 'ap-south-1',
  };
}

function mapLambda(r: LambdaFunctionRecommendation): OptimizationRecommendation | null {
  if (String(r.finding) === 'Optimized') return null;
  const bestOption = r.memorySizeRecommendationOptions?.[0];
  const savings = extractSavings(bestOption);

  return {
    resourceId: r.functionArn?.split(':').pop() || '',
    resourceType: 'Lambda',
    finding: String(r.finding || 'Unknown'),
    currentConfig: `${r.currentMemorySize || 0} MB`,
    recommendedConfig: bestOption?.memorySize ? `${bestOption.memorySize} MB` : 'N/A',
    estimatedMonthlySavings: savings,
    estimatedSavingsPercentage: 0,
    risk: 'Low',
    region: r.functionArn?.split(':')[3] || 'ap-south-1',
  };
}

function mapEBS(r: VolumeRecommendation): OptimizationRecommendation | null {
  if (String(r.finding) === 'Optimized') return null;
  const bestOption = r.volumeRecommendationOptions?.[0];
  const savings = extractSavings(bestOption);

  return {
    resourceId: r.volumeArn?.split('/').pop() || '',
    resourceType: 'EBS',
    finding: String(r.finding || 'Unknown'),
    currentConfig: `${r.currentConfiguration?.volumeType || 'Unknown'} ${r.currentConfiguration?.volumeSize || 0}GB`,
    recommendedConfig: bestOption?.configuration
      ? `${bestOption.configuration.volumeType || 'N/A'} ${bestOption.configuration.volumeSize || 0}GB`
      : 'N/A',
    estimatedMonthlySavings: savings,
    estimatedSavingsPercentage: 0,
    risk: 'Low',
    region: r.volumeArn?.split(':')[3] || 'ap-south-1',
  };
}

function mapRisk(effort: string | undefined): 'VeryLow' | 'Low' | 'Medium' | 'High' {
  switch (effort) {
    case 'VeryLow': return 'VeryLow';
    case 'Low': return 'Low';
    case 'Medium': return 'Medium';
    case 'High': return 'High';
    default: return 'Low';
  }
}

// --- Cache -------------------------------------------------------------------

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (testing mode)
let cachedData: ComputeOptimizerSummary | null = null;
let cachedAt = 0;

// --- Main Fetch Function -----------------------------------------------------

export async function fetchComputeOptimizerRecommendations(): Promise<ComputeOptimizerSummary> {
  if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedData;
  }

  const client = createClient();
  const allRecs: OptimizationRecommendation[] = [];
  let totalResourcesScanned = 0;

  try {
    // Fetch all 4 resource types in parallel
    const [ec2Res, asgRes, lambdaRes, ebsRes] = await Promise.allSettled([
      client.send(new GetEC2InstanceRecommendationsCommand({})),
      client.send(new GetAutoScalingGroupRecommendationsCommand({})),
      client.send(new GetLambdaFunctionRecommendationsCommand({})),
      client.send(new GetEBSVolumeRecommendationsCommand({})),
    ]);

    // Count ALL resources before filtering (to detect "active but all optimized" vs "collecting")
    if (ec2Res.status === 'fulfilled') {
      const resources = ec2Res.value.instanceRecommendations || [];
      totalResourcesScanned += resources.length;
      for (const r of resources) {
        const mapped = mapEC2(r);
        if (mapped) allRecs.push(mapped);
      }
    }

    if (asgRes.status === 'fulfilled') {
      const resources = asgRes.value.autoScalingGroupRecommendations || [];
      totalResourcesScanned += resources.length;
      for (const r of resources) {
        const mapped = mapAutoScaling(r);
        if (mapped) allRecs.push(mapped);
      }
    }

    if (lambdaRes.status === 'fulfilled') {
      const resources = lambdaRes.value.lambdaFunctionRecommendations || [];
      totalResourcesScanned += resources.length;
      for (const r of resources) {
        const mapped = mapLambda(r);
        if (mapped) allRecs.push(mapped);
      }
    }

    if (ebsRes.status === 'fulfilled') {
      const resources = ebsRes.value.volumeRecommendations || [];
      totalResourcesScanned += resources.length;
      for (const r of resources) {
        const mapped = mapEBS(r);
        if (mapped) allRecs.push(mapped);
      }
    }

    // Check if ALL calls failed
    const allFailed = [ec2Res, asgRes, lambdaRes, ebsRes].every((r) => r.status === 'rejected');
    if (allFailed) {
      const firstError = (ec2Res as PromiseRejectedResult).reason;
      const errorMsg = firstError?.message || firstError?.name || 'Unknown error';

      if (errorMsg.includes('OptInRequired') || errorMsg.includes('not opted in') || errorMsg.includes('You are not opted in')) {
        return {
          recommendations: [], totalEstimatedSavings: 0, byType: [],
          optimizerStatus: 'not-enrolled',
          errorMessage: 'AWS Compute Optimizer is not enabled. Enable it from the AWS Console.',
        };
      }

      return {
        recommendations: [], totalEstimatedSavings: 0, byType: [],
        optimizerStatus: 'error',
        errorMessage: errorMsg,
      };
    }

    // If some calls succeeded but returned zero resources total — still collecting
    if (totalResourcesScanned === 0) {
      return {
        recommendations: [], totalEstimatedSavings: 0, byType: [],
        optimizerStatus: 'collecting',
        errorMessage: 'Compute Optimizer is collecting utilization data. Results will be available after ~14 days.',
      };
    }

    // Sort by savings descending
    allRecs.sort((a, b) => b.estimatedMonthlySavings - a.estimatedMonthlySavings);

    // Aggregate by type
    const typeMap = new Map<string, { count: number; savings: number }>();
    for (const r of allRecs) {
      const existing = typeMap.get(r.resourceType) || { count: 0, savings: 0 };
      existing.count++;
      existing.savings += r.estimatedMonthlySavings;
      typeMap.set(r.resourceType, existing);
    }
    const byType = Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.savings - a.savings);

    const totalEstimatedSavings = allRecs.reduce((sum, r) => sum + r.estimatedMonthlySavings, 0);

    const summary: ComputeOptimizerSummary = {
      recommendations: allRecs,
      totalEstimatedSavings,
      byType,
      optimizerStatus: 'active',
    };

    cachedData = summary;
    cachedAt = Date.now();
    return summary;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg.includes('OptInRequired') || msg.includes('not opted in')) {
      return {
        recommendations: [], totalEstimatedSavings: 0, byType: [],
        optimizerStatus: 'not-enrolled',
        errorMessage: 'AWS Compute Optimizer is not enabled.',
      };
    }

    // Return stale cache if available
    if (cachedData) return cachedData;

    return {
      recommendations: [], totalEstimatedSavings: 0, byType: [],
      optimizerStatus: 'error',
      errorMessage: msg,
    };
  }
}
