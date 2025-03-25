import { scrapeCNNCoupons } from '@/app/utils/cnnScraper';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Please provide valid URLs' 
      }, { status: 400 });
    }

    const filePath = await scrapeCNNCoupons(urls);
    
    return NextResponse.json({ 
      success: true, 
      filePath: filePath 
    });
    
  } catch (error) {
    console.error('Error in CNN coupon route:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}