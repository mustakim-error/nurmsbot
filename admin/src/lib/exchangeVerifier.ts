/**
 * Server-Side Exchange Read-Only API Verifier for NURMS Admin & Bot
 */

import crypto from 'crypto';

export interface ExchangeVerificationResult {
  canVerify: boolean;
  verified?: boolean;
  amount?: number;
  currency?: string;
  orderId?: string;
  exchange?: string;
  payer?: string;
  senderUid?: string;
  timestamp?: number;
  reason?: string;
  error?: boolean;
}

export async function verifyBinancePayment(
  apiKey: string,
  apiSecret: string,
  searchId: string
): Promise<ExchangeVerificationResult> {
  if (!apiKey || !apiSecret) {
    return {
      canVerify: false,
      reason: 'Binance Read-Only API Key & Secret not configured in Gateway settings.'
    };
  }

  const cleanId = (searchId || '').trim();
  if (!cleanId) {
    return { canVerify: false, reason: 'Empty Transaction / Order ID provided.' };
  }

  try {
    const timestamp = Date.now();
    const payQuery = `timestamp=${timestamp}&recvWindow=10000`;
    const paySignature = crypto.createHmac('sha256', apiSecret).update(payQuery).digest('hex');
    const payUrl = `https://api.binance.com/sapi/v1/pay/transactions?${payQuery}&signature=${paySignature}`;

    const payRes = await fetch(payUrl, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (payRes.ok) {
      const payData = await payRes.json();
      if (payData && payData.data && Array.isArray(payData.data)) {
        for (const item of payData.data) {
          const matchTx = item.transactionId && String(item.transactionId).toLowerCase().includes(cleanId.toLowerCase());
          const matchOrder = item.orderId && String(item.orderId).toLowerCase().includes(cleanId.toLowerCase());
          const matchCustom = String(cleanId).toLowerCase().includes(String(item.transactionId || '').toLowerCase());

          if (matchTx || matchOrder || matchCustom) {
            const amount = parseFloat(item.amount || '0');
            if (amount > 0) {
              return {
                canVerify: true,
                verified: true,
                amount,
                currency: item.currency || 'USDT',
                orderId: item.transactionId || item.orderId || cleanId,
                exchange: 'Binance Pay',
                payer: item.payerInfo?.name || item.payerInfo?.accountId || 'Verified Payer',
                timestamp: item.transactionTime || Date.now()
              };
            }
          }
        }
      }
    }

    // Fallback: Deposit history
    const depTimestamp = Date.now();
    const depQuery = `timestamp=${depTimestamp}&recvWindow=10000`;
    const depSignature = crypto.createHmac('sha256', apiSecret).update(depQuery).digest('hex');
    const depUrl = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${depQuery}&signature=${depSignature}`;

    const depRes = await fetch(depUrl, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (depRes.ok) {
      const depData = await depRes.json();
      const list = Array.isArray(depData) ? depData : depData?.data || [];
      for (const item of list) {
        const matchTx = item.txId && String(item.txId).toLowerCase().includes(cleanId.toLowerCase());
        const matchId = item.id && String(item.id).toLowerCase().includes(cleanId.toLowerCase());
        if (matchTx || matchId) {
          if (item.status === 1) {
            const amount = parseFloat(item.amount || '0');
            return {
              canVerify: true,
              verified: true,
              amount,
              currency: item.coin || 'USDT',
              orderId: item.txId || item.id || cleanId,
              exchange: 'Binance Deposit',
              timestamp: item.insertTime || Date.now()
            };
          }
        }
      }
    } else {
      const errJson = await depRes.json().catch(() => ({}));
      if (errJson.msg) {
        return {
          canVerify: false,
          error: true,
          reason: `Binance API error: ${errJson.msg} (Code: ${errJson.code})`
        };
      }
    }

    return {
      canVerify: true,
      verified: false,
      reason: 'Transaction ID / Order ID was not found in recent Binance records.'
    };
  } catch (err: any) {
    return {
      canVerify: false,
      error: true,
      reason: `Binance API network error: ${err.message}`
    };
  }
}

export async function verifyBybitPayment(
  apiKey: string,
  apiSecret: string,
  searchId: string
): Promise<ExchangeVerificationResult> {
  if (!apiKey || !apiSecret) {
    return {
      canVerify: false,
      reason: 'Bybit Read-Only API Key & Secret not configured in Gateway settings.'
    };
  }

  const cleanId = (searchId || '').trim();
  if (!cleanId) {
    return { canVerify: false, reason: 'Empty Transaction / Transfer ID provided.' };
  }

  try {
    const timestamp = Date.now().toString();
    const recvWindow = '10000';

    // 1. Query Internal UID Transfers
    const internalQs = 'limit=50';
    const prehashInternal = timestamp + apiKey + recvWindow + internalQs;
    const signInternal = crypto.createHmac('sha256', apiSecret).update(prehashInternal).digest('hex');

    const internalRes = await fetch(`https://api.bybit.com/v5/asset/deposit/query-internal-record?${internalQs}`, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-SIGN': signInternal,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (internalRes.ok) {
      const internalData = await internalRes.json();
      if (internalData.retCode === 0 && internalData.result?.rows) {
        for (const item of internalData.result.rows) {
          const matchId = item.id && String(item.id).toLowerCase().includes(cleanId.toLowerCase());
          const matchTx = item.txID && String(item.txID).toLowerCase().includes(cleanId.toLowerCase());
          if (matchId || matchTx) {
            if (Number(item.status) === 1) {
              const amount = parseFloat(item.amount || '0');
              return {
                canVerify: true,
                verified: true,
                amount,
                currency: item.coin || 'USDT',
                orderId: item.id || item.txID || cleanId,
                exchange: 'Bybit Internal Transfer (UID)',
                senderUid: item.address || '',
                timestamp: Number(item.createdTime) || Date.now()
              };
            }
          }
        }
      } else if (internalData.retCode !== 0) {
        return {
          canVerify: false,
          error: true,
          reason: `Bybit API error: ${internalData.retMsg} (Code: ${internalData.retCode})`
        };
      }
    }

    // 2. Query On-Chain Deposit
    const depQs = 'limit=50';
    const prehashDep = timestamp + apiKey + recvWindow + depQs;
    const signDep = crypto.createHmac('sha256', apiSecret).update(prehashDep).digest('hex');

    const depRes = await fetch(`https://api.bybit.com/v5/asset/deposit/query-record?${depQs}`, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-SIGN': signDep,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (depRes.ok) {
      const depData = await depRes.json();
      if (depData.retCode === 0 && depData.result?.rows) {
        for (const item of depData.result.rows) {
          const matchTx = item.txID && String(item.txID).toLowerCase().includes(cleanId.toLowerCase());
          if (matchTx && Number(item.status) === 3) {
            const amount = parseFloat(item.amount || '0');
            return {
              canVerify: true,
              verified: true,
              amount,
              currency: item.coin || 'USDT',
              orderId: item.txID || cleanId,
              exchange: 'Bybit Deposit',
              timestamp: Number(item.successAt) || Date.now()
            };
          }
        }
      }
    }

    return {
      canVerify: true,
      verified: false,
      reason: 'Transaction ID / Transfer ID was not found in your recent Bybit records.'
    };
  } catch (err: any) {
    return {
      canVerify: false,
      error: true,
      reason: `Bybit API network error: ${err.message}`
    };
  }
}

export async function testBinanceConnection(apiKey: string, apiSecret: string) {
  try {
    const timestamp = Date.now();
    const query = `timestamp=${timestamp}&recvWindow=10000`;
    const signature = crypto.createHmac('sha256', apiSecret).update(query).digest('hex');
    const url = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${query}&signature=${signature}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-MBX-APIKEY': apiKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    const data = await res.json();
    if (res.ok && (Array.isArray(data) || data.data)) {
      return { success: true, message: 'Connected successfully to Binance Read-Only API!' };
    }
    return { success: false, message: data.msg || `Binance API error (Code: ${data.code})` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function testBybitConnection(apiKey: string, apiSecret: string) {
  try {
    const timestamp = Date.now().toString();
    const recvWindow = '10000';
    const qs = 'limit=1';
    const prehash = timestamp + apiKey + recvWindow + qs;
    const signature = crypto.createHmac('sha256', apiSecret).update(prehash).digest('hex');

    const res = await fetch(`https://api.bybit.com/v5/asset/deposit/query-internal-record?${qs}`, {
      method: 'GET',
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-TIMESTAMP': timestamp,
        'X-BAPI-SIGN': signature,
        'X-BAPI-RECV-WINDOW': recvWindow,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(6000)
    });

    const data = await res.json();
    if (data.retCode === 0) {
      return { success: true, message: 'Connected successfully to Bybit Read-Only API!' };
    }
    return { success: false, message: data.retMsg || `Bybit API error (Code: ${data.retCode})` };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
