import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { type CostSummary, buildCostContextPrompt } from '@/lib/ai/cost-context';
import { generateLocalResponse } from '@/lib/ai/local-engine';
import { getDashboardData } from '@/lib/cloud/fetchDashboardData';
import { z } from 'zod';

const requestSchema = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(20)
    .optional(),
});

/** Build a CostSummary from live AWS dashboard data */
async function buildLiveCostSummary(): Promise<CostSummary> {
  const data = await getDashboardData();

  return {
    totalSpendMTD: data.totalSpendMTD,
    forecastedSpend: data.forecastedSpend,
    savingsIdentified: 0,
    activeAnomalies: 0,
    providers: [
      { name: 'AWS', spend: data.totalSpendMTD, change: data.changePercentage },
    ],
    topServices: data.topServices,
    budgets: [],
    recommendations: [],
    anomalies: [],
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in required' } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  const { message } = parsed.data;

  // Get live cost data (cached, so no extra API calls)
  const costData = await buildLiveCostSummary();

  // If an AI API key is configured, use external LLM
  const aiApiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

  if (aiApiKey && process.env.ANTHROPIC_API_KEY) {
    try {
      const systemPrompt = buildCostContextPrompt(costData);
      const messages = [
        ...(parsed.data.history || []).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: message },
      ];

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          message: data.content[0].text,
          source: 'ai',
        });
      }
    } catch {
      // Fall through to local engine
    }
  }

  // Local smart engine (no API key needed)
  const reply = generateLocalResponse(message, costData);
  return NextResponse.json({
    message: reply,
    source: 'local',
  });
}
