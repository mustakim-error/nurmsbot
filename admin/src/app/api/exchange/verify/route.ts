import { NextRequest, NextResponse } from 'next/server';
import { verifyBinancePayment, verifyBybitPayment } from '@/lib/exchangeVerifier';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { exchange, apiKey, apiSecret, txId } = body;

    if (!txId) {
      return NextResponse.json({ verified: false, reason: 'Transaction / Order ID is required.' }, { status: 400 });
    }

    if (exchange === 'binance' || exchange === 'binance-pay') {
      const result = await verifyBinancePayment(apiKey, apiSecret, txId);
      return NextResponse.json(result);
    } else if (exchange === 'bybit' || exchange === 'bybit-pay') {
      const result = await verifyBybitPayment(apiKey, apiSecret, txId);
      return NextResponse.json(result);
    } else {
      return NextResponse.json({ verified: false, reason: 'Unsupported exchange.' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ verified: false, error: true, reason: err.message }, { status: 500 });
  }
}
