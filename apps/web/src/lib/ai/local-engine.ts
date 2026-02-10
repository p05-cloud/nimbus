import { type CostSummary } from './cost-context';

// Smart rule-based response engine that works without an external API.
// Matches user intent and generates contextual responses from cost data.

interface IntentMatch {
  patterns: RegExp[];
  handler: (data: CostSummary, query: string) => string;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

const intents: IntentMatch[] = [
  {
    patterns: [/total.*spend|how much.*spent|overall.*cost|total.*cost|mtd/i],
    handler: (d) =>
      `**Total Spend (MTD):** ${fmt(d.totalSpendMTD)}\n\n**Forecasted Monthly:** ${fmt(d.forecastedSpend)}\n\nBreakdown by provider:\n${d.providers.map((p) => `- **${p.name}:** ${fmt(p.spend)} (${pct(p.change)} MoM)`).join('\n')}\n\nAWS is the largest contributor at ${((d.providers[0].spend / d.totalSpendMTD) * 100).toFixed(0)}% of total spend.`,
  },
  {
    patterns: [/top.*service|highest.*service|most.*expensive|top.*spend/i],
    handler: (d) => {
      const top5 = d.topServices.slice(0, 5);
      return `**Top 5 Services by Cost (MTD):**\n\n${top5.map((s, i) => `${i + 1}. **${s.name}** (${s.provider}) — ${fmt(s.cost)} ${pct(s.change)} MoM`).join('\n')}\n\n**Key Insight:** ${top5[0].name} is your highest cost service at ${fmt(top5[0].cost)}.${top5.find((s) => s.change > 10) ? ` Watch **${top5.find((s) => s.change > 10)!.name}** — it spiked ${pct(top5.find((s) => s.change > 10)!.change)} this month.` : ''}`;
    },
  },
  {
    patterns: [/aws|amazon/i],
    handler: (d) => {
      const awsServices = d.topServices.filter((s) => s.provider === 'AWS');
      const awsProvider = d.providers.find((p) => p.name === 'AWS')!;
      const awsBudget = d.budgets.find((b) => b.provider === 'AWS');
      return `**AWS Spend Overview:**\n\n**Total:** ${fmt(awsProvider.spend)} (${pct(awsProvider.change)} MoM)\n\n**Top AWS Services:**\n${awsServices.map((s) => `- ${s.name}: ${fmt(s.cost)} (${pct(s.change)})`).join('\n')}\n\n${awsBudget ? `**Budget:** ${fmt(awsBudget.spent)} / ${fmt(awsBudget.limit)} (${((awsBudget.spent / awsBudget.limit) * 100).toFixed(0)}% used)` : ''}\n\nAWS anomalies: ${d.anomalies.filter((a) => a.provider === 'AWS' && a.status === 'open').length} open`;
    },
  },
  {
    patterns: [/azure|microsoft/i],
    handler: (d) => {
      const services = d.topServices.filter((s) => s.provider === 'Azure');
      const provider = d.providers.find((p) => p.name === 'Azure')!;
      const budget = d.budgets.find((b) => b.provider === 'Azure');
      return `**Azure Spend Overview:**\n\n**Total:** ${fmt(provider.spend)} (${pct(provider.change)} MoM)\n\n**Top Azure Services:**\n${services.map((s) => `- ${s.name}: ${fmt(s.cost)} (${pct(s.change)})`).join('\n')}\n\n${budget ? `**Budget:** ${fmt(budget.spent)} / ${fmt(budget.limit)} (${((budget.spent / budget.limit) * 100).toFixed(0)}% used)` : ''}`;
    },
  },
  {
    patterns: [/gcp|google/i],
    handler: (d) => {
      const services = d.topServices.filter((s) => s.provider === 'GCP');
      const provider = d.providers.find((p) => p.name === 'GCP')!;
      const budget = d.budgets.find((b) => b.provider === 'GCP');
      return `**GCP Spend Overview:**\n\n**Total:** ${fmt(provider.spend)} (${pct(provider.change)} MoM)\n\n**Top GCP Services:**\n${services.map((s) => `- ${s.name}: ${fmt(s.cost)} (${pct(s.change)})`).join('\n')}\n\n${budget ? `**Budget:** ${fmt(budget.spent)} / ${fmt(budget.limit)} (${((budget.spent / budget.limit) * 100).toFixed(0)}% used) ⚠️ **Over budget!**` : ''}`;
    },
  },
  {
    patterns: [/saving|optimiz|recommend|reduce|cut.*cost/i],
    handler: (d) => {
      const total = d.recommendations.reduce((s, r) => s + r.savings, 0);
      const sorted = [...d.recommendations].sort((a, b) => b.savings - a.savings);
      return `**Optimization Recommendations:**\n\n**Total Potential Savings:** ${fmt(total)}/month (${fmt(total * 12)}/year)\n\n${sorted.map((r) => `- **${r.category}:** ${r.count} items — ${fmt(r.savings)}/mo`).join('\n')}\n\n**Top Action:** Focus on **${sorted[0].category}** first — it offers the highest savings at ${fmt(sorted[0].savings)}/month across ${sorted[0].count} resources.`;
    },
  },
  {
    patterns: [/anomal|spike|unusual|alert|incident/i],
    handler: (d) => {
      const open = d.anomalies.filter((a) => a.status === 'open');
      const totalImpact = open.reduce((s, a) => s + a.impact, 0);
      return `**Active Anomalies:** ${open.length}\n**Total Impact:** ${fmt(totalImpact)}\n\n${open.map((a) => `🔴 **${a.title}**\n   Provider: ${a.provider} | Service: ${a.service} | Impact: ${fmt(a.impact)}`).join('\n\n')}\n\n**Action Required:** The EC2 data transfer spike (${fmt(open[0]?.impact || 0)}) should be investigated first as it has the highest impact.`;
    },
  },
  {
    patterns: [/budget|over.*budget|under.*budget|limit/i],
    handler: (d) => {
      const overBudget = d.budgets.filter((b) => b.spent > b.limit);
      const atRisk = d.budgets.filter((b) => b.spent / b.limit > 0.8 && b.spent <= b.limit);
      return `**Budget Status:**\n\n${d.budgets.map((b) => {
        const pctUsed = (b.spent / b.limit) * 100;
        const status = pctUsed > 100 ? '🔴 OVER' : pctUsed > 80 ? '🟡 WARNING' : '🟢 OK';
        return `${status} **${b.name}:** ${fmt(b.spent)} / ${fmt(b.limit)} (${pctUsed.toFixed(0)}%)`;
      }).join('\n')}\n\n${overBudget.length > 0 ? `⚠️ **${overBudget.length} budget(s) exceeded!** ${overBudget.map((b) => b.name).join(', ')} need immediate attention.` : '✅ No budgets exceeded yet.'}${atRisk.length > 0 ? `\n🟡 **${atRisk.length} budget(s) at risk** of exceeding this month.` : ''}`;
    },
  },
  {
    patterns: [/forecast|predict|next month|project/i],
    handler: (d) => {
      const totalReco = d.recommendations.reduce((s, r) => s + r.savings, 0);
      return `**Forecast:**\n\n- **Current MTD:** ${fmt(d.totalSpendMTD)}\n- **Forecasted Monthly Total:** ${fmt(d.forecastedSpend)}\n- **If optimizations applied:** ${fmt(d.forecastedSpend - totalReco)}/month\n\n**Potential Annual Savings:** ${fmt(totalReco * 12)}\n\nBy implementing all ${d.recommendations.reduce((s, r) => s + r.count, 0)} recommendations, you could reduce forecasted spend by ${((totalReco / d.forecastedSpend) * 100).toFixed(0)}%.`;
    },
  },
  {
    patterns: [/summary|overview|status|report|brief/i],
    handler: (d) => {
      const openAnomalies = d.anomalies.filter((a) => a.status === 'open');
      const overBudget = d.budgets.filter((b) => b.spent > b.limit);
      const totalReco = d.recommendations.reduce((s, r) => s + r.savings, 0);
      return `**NOC Summary — Cloud FinOps Status:**\n\n💰 **Spend MTD:** ${fmt(d.totalSpendMTD)} | Forecast: ${fmt(d.forecastedSpend)}\n📊 **Top Provider:** AWS at ${fmt(d.providers[0].spend)}\n🔴 **Anomalies:** ${openAnomalies.length} open (${fmt(openAnomalies.reduce((s, a) => s + a.impact, 0))} impact)\n📋 **Budgets:** ${overBudget.length > 0 ? `${overBudget.length} exceeded` : 'All within limits'}\n💡 **Savings Available:** ${fmt(totalReco)}/month\n\n**Immediate Actions:**\n1. Investigate EC2 data transfer anomaly\n2. Review GCP Analytics budget (over limit)\n3. Apply Reserved Instance recommendations (${fmt(12400)}/mo savings)`;
    },
  },
  {
    patterns: [/hello|hi|hey|help|what can you/i],
    handler: () =>
      `👋 I'm **Nimbus AI**, your Cloud FinOps assistant. I can help you with:\n\n- **"What's our total spend?"** — Current MTD and forecast\n- **"Top spending services"** — Highest cost services\n- **"AWS/Azure/GCP spend"** — Provider-specific breakdown\n- **"Show anomalies"** — Active cost anomalies\n- **"Budget status"** — Budget tracking\n- **"How can we save?"** — Optimization recommendations\n- **"Give me a summary"** — Full NOC status report\n\nAsk me anything about your cloud costs!`,
  },
];

export function generateLocalResponse(query: string, data: CostSummary): string {
  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      if (pattern.test(query)) {
        return intent.handler(data, query);
      }
    }
  }

  // Fallback
  return `I understand you're asking about: "${query}"\n\nHere's a quick summary of your cloud costs:\n\n- **Total Spend MTD:** ${fmt(data.totalSpendMTD)}\n- **Top Service:** ${data.topServices[0].name} at ${fmt(data.topServices[0].cost)}\n- **Active Anomalies:** ${data.anomalies.filter((a) => a.status === 'open').length}\n- **Savings Available:** ${fmt(data.recommendations.reduce((s, r) => s + r.savings, 0))}/month\n\nTry asking about specific providers (AWS, Azure, GCP), budgets, anomalies, or recommendations for more detail.`;
}
