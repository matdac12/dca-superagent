import { NextResponse } from 'next/server';
import { loadPlan, SUPPORTED_AGENT_PLAN_NAMES } from '@/lib/storage/agentPlans';

export async function GET() {
  try {
    const plans = await Promise.all(
      SUPPORTED_AGENT_PLAN_NAMES.map(async agentName => {
        const planData = await loadPlan(agentName).catch(() => null);

        return {
          agent: agentName,
          plan: planData?.plan ?? null,
          lastUpdated: planData?.lastUpdated ?? null,
        };
      })
    );

    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    console.error('Failed to retrieve agent plans:', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? 'Unable to load agent plans',
      },
      { status: 500 }
    );
  }
}
