import { NextRequest, NextResponse } from 'next/server';
import { testBinanceConnection, testBybitConnection } from '@/lib/exchangeVerifier';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exchange, apiKey, apiSecret } = body;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ success: false, message: 'API Key and Secret are required.' }, { status: 400 });
    }

    if (exchange === 'binance') {
      const result = await testBinanceConnection(apiKey, apiSecret);
      return NextResponse.json(result);
    } else if (exchange === 'bybit') {
      const result = await testBybitConnection(apiKey, apiSecret);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ success: false, message: 'Invalid exchange specified.' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
