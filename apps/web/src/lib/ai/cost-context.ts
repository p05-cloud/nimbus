// Sample cost data that provides context for the AI chatbot.
// In production this will be replaced by real database queries.

export interface CostSummary {
  totalSpendMTD: number;
  forecastedSpend: number;
  savingsIdentified: number;
  activeAnomalies: number;
  providers: { name: string; spend: number; change: number }[];
  topServices: { name: string; provider: string; cost: number; change: number }[];
  budgets: { name: string; limit: number; spent: number; provider: string }[];
  recommendations: { category: string; count: number; savings: number }[];
  anomalies: { title: string; provider: string; service: string; impact: number; status: string }[];
}

export const sampleCostData: CostSummary = {
  totalSpendMTD: 47832.5,
  forecastedSpend: 92150.0,
  savingsIdentified: 12450.0,
  activeAnomalies: 3,
  providers: [
    { name: 'AWS', spend: 20800, change: -2.1 },
    { name: 'Azure', spend: 14200, change: 5.3 },
    { name: 'GCP', spend: 9600, change: -0.8 },
    { name: 'Kubernetes', spend: 3200, change: 1.2 },
  ],
  topServices: [
    { name: 'Amazon EC2', provider: 'AWS', cost: 8420, change: -2.1 },
    { name: 'Azure SQL Database', provider: 'Azure', cost: 5230, change: 5.3 },
    { name: 'Amazon S3', provider: 'AWS', cost: 4180, change: -0.8 },
    { name: 'GCE Instances', provider: 'GCP', cost: 3950, change: 12.1 },
    { name: 'Amazon RDS', provider: 'AWS', cost: 3620, change: -4.5 },
    { name: 'Azure Virtual Machines', provider: 'Azure', cost: 3210, change: 1.2 },
    { name: 'Cloud Storage', provider: 'GCP', cost: 2890, change: -1.5 },
    { name: 'Amazon EKS', provider: 'AWS', cost: 2450, change: 8.7 },
  ],
  budgets: [
    { name: 'AWS Production', limit: 25000, spent: 20800, provider: 'AWS' },
    { name: 'Azure Development', limit: 10000, spent: 7200, provider: 'Azure' },
    { name: 'GCP Analytics', limit: 8000, spent: 9600, provider: 'GCP' },
    { name: 'K8s Platform', limit: 5000, spent: 3200, provider: 'Kubernetes' },
  ],
  recommendations: [
    { category: 'Rightsizing', count: 24, savings: 4820 },
    { category: 'Reserved Instances', count: 8, savings: 12400 },
    { category: 'Idle Resources', count: 31, savings: 3250 },
    { category: 'Storage Optimization', count: 15, savings: 1890 },
    { category: 'Spot Instances', count: 6, savings: 5600 },
    { category: 'Network Optimization', count: 9, savings: 2100 },
  ],
  anomalies: [
    { title: 'Unusual spike in EC2 data transfer', provider: 'AWS', service: 'EC2', impact: 2840, status: 'open' },
    { title: 'Azure SQL DTU consumption anomaly', provider: 'Azure', service: 'SQL Database', impact: 1250, status: 'open' },
    { title: 'GCP BigQuery scan cost spike', provider: 'GCP', service: 'BigQuery', impact: 890, status: 'open' },
    { title: 'Lambda invocation count anomaly', provider: 'AWS', service: 'Lambda', impact: 420, status: 'resolved' },
  ],
};

export function buildCostContextPrompt(data: CostSummary): string {
  const totalReco = data.recommendations.reduce((s, r) => s + r.savings, 0);
  const openAnomalies = data.anomalies.filter((a) => a.status === 'open');

  return `You are Nimbus AI, an expert Cloud FinOps assistant for a BFSI enterprise. You help teams understand their cloud spending, identify optimization opportunities, and answer billing questions.

CURRENT COST DATA (Month-to-Date):
- Total Spend MTD: ₹${data.totalSpendMTD.toLocaleString('en-IN')}
- Forecasted Monthly Spend: ₹${data.forecastedSpend.toLocaleString('en-IN')}
- Identified Savings: ₹${totalReco.toLocaleString('en-IN')}/month

SPEND BY PROVIDER:
${data.providers.map((p) => `- ${p.name}: ₹${p.spend.toLocaleString('en-IN')} (${p.change >= 0 ? '+' : ''}${p.change}% MoM)`).join('\n')}

TOP SERVICES BY COST:
${data.topServices.map((s) => `- ${s.name} (${s.provider}): ₹${s.cost.toLocaleString('en-IN')} (${s.change >= 0 ? '+' : ''}${s.change}% MoM)`).join('\n')}

BUDGET STATUS:
${data.budgets.map((b) => `- ${b.name}: ₹${b.spent.toLocaleString('en-IN')} / ₹${b.limit.toLocaleString('en-IN')} (${((b.spent / b.limit) * 100).toFixed(1)}%)`).join('\n')}

OPTIMIZATION RECOMMENDATIONS:
${data.recommendations.map((r) => `- ${r.category}: ${r.count} items, ₹${r.savings.toLocaleString('en-IN')}/mo potential savings`).join('\n')}

ACTIVE ANOMALIES:
${openAnomalies.map((a) => `- ${a.title} (${a.provider}/${a.service}): ₹${a.impact.toLocaleString('en-IN')} impact`).join('\n')}

INSTRUCTIONS:
- Answer concisely and precisely using the data above
- Use ₹ (INR) for all currency values
- Use Indian numbering format (lakhs, crores) for large amounts
- Highlight risks, savings opportunities, and actionable insights
- If asked about something not in the data, say so clearly
- Keep responses focused and NOC-room friendly (brief, actionable)`;
}
