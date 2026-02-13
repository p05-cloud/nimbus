import { NextRequest, NextResponse } from 'next/server';
import { fetchNonCompliantResources } from '@/lib/cloud/aws-config';

export async function GET(request: NextRequest) {
  const ruleName = request.nextUrl.searchParams.get('rule');

  if (!ruleName) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAM', message: 'rule parameter is required' } },
      { status: 400 },
    );
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return NextResponse.json(
      { error: { code: 'NO_CREDENTIALS', message: 'AWS credentials not configured' } },
      { status: 500 },
    );
  }

  try {
    const resources = await fetchNonCompliantResources(ruleName);
    return NextResponse.json({ resources });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message } },
      { status: 500 },
    );
  }
}
