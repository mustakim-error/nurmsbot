/**
 * Exchange Read-Only API Payment Verifier for Binance Pay and Bybit Pay
 * Automatically verifies incoming payments using Read-Only API keys
 */

const crypto = require('crypto');

/**
 * Verify payment with Binance Read-Only API
 * Checks Binance Pay transaction history and Capital Deposit history
 * @param {string} apiKey - Binance Read-Only API Key
 * @param {string} apiSecret - Binance Secret Key
 * @param {string} searchId - User submitted Transaction ID or Order ID
 */
async function verifyBinancePayment(apiKey, apiSecret, searchId) {
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
    // 1. Query Binance Pay Transactions History
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
            // Check status: SUCCESS, PAID, or positive amount
            const amount = parseFloat(item.amount || '0');
            if (amount > 0) {
              return {
                canVerify: true,
                verified: true,
                amount: amount,
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

    // 2. Fallback: Query Binance Deposit History (Capital SAPI)
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
          if (item.status === 1) { // 1 = Success on Binance
            const amount = parseFloat(item.amount || '0');
            return {
              canVerify: true,
              verified: true,
              amount: amount,
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
      reason: 'Transaction ID / Order ID was not found in recent Binance Pay or Deposit history.'
    };
  } catch (err) {
    return {
      canVerify: false,
      error: true,
      reason: `Binance network/API error: ${err.message}`
    };
  }
}

/**
 * Verify payment with Bybit Read-Only API
 * Checks Bybit V5 Internal Transfer Deposit Record and General Deposit Record
 * @param {string} apiKey - Bybit Read-Only API Key
 * @param {string} apiSecret - Bybit Secret Key
 * @param {string} searchId - User submitted Transfer ID or TxID
 */
async function verifyBybitPayment(apiKey, apiSecret, searchId) {
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

    // 1. Query Bybit Internal Transfer Deposit Records (UID Transfers)
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
            // Status 1 = Success
            if (Number(item.status) === 1) {
              const amount = parseFloat(item.amount || '0');
              return {
                canVerify: true,
                verified: true,
                amount: amount,
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

    // 2. Fallback: Query Bybit On-Chain Deposit Records
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
          if (matchTx) {
            // Status 3 = Success in Bybit query-record
            if (Number(item.status) === 3) {
              const amount = parseFloat(item.amount || '0');
              return {
                canVerify: true,
                verified: true,
                amount: amount,
                currency: item.coin || 'USDT',
                orderId: item.txID || cleanId,
                exchange: 'Bybit Deposit',
                timestamp: Number(item.successAt) || Date.now()
              };
            }
          }
        }
      }
    }

    return {
      canVerify: true,
      verified: false,
      reason: 'Transaction ID / Transfer ID was not found in your recent Bybit records.'
    };
  } catch (err) {
    return {
      canVerify: false,
      error: true,
      reason: `Bybit network/API error: ${err.message}`
    };
  }
}

/**
 * Test Binance Read-Only API connection
 */
async function testBinanceConnection(apiKey, apiSecret) {
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
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Test Bybit Read-Only API connection
 */
async function testBybitConnection(apiKey, apiSecret) {
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
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = {
  verifyBinancePayment,
  verifyBybitPayment,
  testBinanceConnection,
  testBybitConnection
};
