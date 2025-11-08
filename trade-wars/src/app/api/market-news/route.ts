import { NextResponse } from 'next/server';
import { fetchMarketNews, saveMarketNews, getStoredMarketNews } from '@/lib/exa/marketNews';

/**
 * POST /api/market-news
 * Triggers fresh market research from Exa AI and saves it
 */
export async function POST() {
  try {
    console.log('📡 Fetching fresh market news from Exa AI...');

    const newsData = await fetchMarketNews();
    await saveMarketNews(newsData);

    console.log('✓ Market news fetched and saved successfully');
    console.log(`  Sentiment: ${newsData.sentiment}`);
    console.log(`  Significant Event: ${newsData.significantEvent}`);

    return NextResponse.json({
      success: true,
      data: newsData,
      message: 'Market research completed successfully'
    });
  } catch (error: any) {
    console.error('Market news API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch market news'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/market-news
 * Returns stored market research (for debugging/display)
 */
export async function GET() {
  try {
    const newsData = await getStoredMarketNews();

    if (!newsData) {
      return NextResponse.json(
        {
          success: false,
          message: 'No market research available. Click "Research Market" to fetch.'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newsData
    });
  } catch (error: any) {
    console.error('Failed to get stored market news:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve market news'
      },
      { status: 500 }
    );
  }
}
