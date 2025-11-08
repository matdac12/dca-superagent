/**
 * Test OpenAI Adapter - Debugging Endpoint
 */

import { NextResponse } from 'next/server';
import { OpenAIAdapter } from '@/lib/council/adapters';

export async function POST(request: Request) {
  try {
    console.log('🧪 Testing OpenAI Adapter...');

    // Fetch market intelligence
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const marketResponse = await fetch(`${baseUrl}/api/market-intelligence`);

    if (!marketResponse.ok) {
      throw new Error('Failed to fetch market intelligence');
    }

    const marketData = await marketResponse.json();
    console.log('✅ Market data fetched');

    // Create OpenAI adapter and generate proposal
    const adapter = new OpenAIAdapter();
    console.log('⏳ Calling OpenAI generateProposal...');

    const startTime = Date.now();
    const proposal = await adapter.generateProposal(marketData);
    const duration = Date.now() - startTime;

    console.log(`✅ OpenAI proposal generated in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration,
      proposal: {
        model: proposal.model,
        action: proposal.actions[0].type,
        reasoning: proposal.reasoning.substring(0, 200) + '...',
        plan: proposal.plan.substring(0, 200) + '...',
      },
    });
  } catch (error: any) {
    console.error('❌ OpenAI Adapter Test Failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);

    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          status: error.status,
          stack: error.stack,
        },
      },
      { status: 500 }
    );
  }
}
