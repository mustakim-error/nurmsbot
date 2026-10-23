/**
 * On-Chain Blockchain Transaction Verifier for NURMS Admin & Bot
 * Supports BSC (BEP20 USDT) and Polygon (Polygon USDT) via native JSON-RPC
 */

const RPC_ENDPOINTS: Record<string, string[]> = {
  bsc: [
    'https://bsc-dataseed.binance.org/',
    'https://bsc-dataseed1.defibit.io/',
    'https://bsc-dataseed1.ninicoin.io/'
  ],
  polygon: [
    'https://polygon-bor-rpc.publicnode.com',
    'https://1rpc.io/matic'
  ]
};

const USDT_CONTRACTS: Record<string, string> = {
  bsc: '0x55d398326f99059ff775485246999027b3197955',     // 18 decimals
  polygon: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f' // 6 decimals
};

const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export function detectChain(gateway: { id?: string; network?: string; name?: string }): 'bsc' | 'polygon' | null {
  const str = `${gateway.id || ''} ${gateway.network || ''} ${gateway.name || ''}`.toLowerCase();
  if (str.includes('polygon') || str.includes('matic')) return 'polygon';
  if (str.includes('bep20') || str.includes('bsc') || str.includes('binance smart chain')) return 'bsc';
  return null;
}

async function callRpc(chain: 'bsc' | 'polygon', method: string, params: any[] = []): Promise<any> {
  const endpoints = RPC_ENDPOINTS[chain] || [];
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
        signal: AbortSignal.timeout(6000)
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data && data.result !== undefined) {
        return data.result;
      }
    } catch {
      // try next endpoint
    }
  }
  return null;
}

export interface VerificationResult {
  canVerify: boolean;
  verified?: boolean;
  pending?: boolean;
  failed?: boolean;
  amount?: number;
  chain?: 'bsc' | 'polygon';
  reason?: string;
  txHash?: string;
}

export async function verifyOnChainTx(
  gateway: { id?: string; network?: string; name?: string; address?: string },
  txHash: string
): Promise<VerificationResult> {
  const cleanTx = (txHash || '').trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(cleanTx)) {
    return {
      canVerify: false,
      reason: 'Transaction ID is not a 66-character EVM hexadecimal hash.'
    };
  }

  const chain = detectChain(gateway);
  if (!chain) {
    return {
      canVerify: false,
      reason: 'Automated on-chain verification is only active for BEP20 and Polygon networks.'
    };
  }

  const targetAddress = (gateway.address || '').trim().toLowerCase();
  if (!targetAddress || targetAddress.length < 20) {
    return {
      canVerify: false,
      reason: 'Gateway deposit address is not configured.'
    };
  }

  try {
    const receipt = await callRpc(chain, 'eth_getTransactionReceipt', [cleanTx]);

    if (!receipt) {
      return {
        canVerify: true,
        verified: false,
        pending: true,
        reason: 'Transaction not found in mined blocks yet. It may still be confirming on the blockchain.'
      };
    }

    if (receipt.status === '0x0') {
      return {
        canVerify: true,
        verified: false,
        failed: true,
        reason: 'Transaction failed (reverted) on the blockchain.'
      };
    }

    const cleanAddressOnly = targetAddress.replace(/^0x/, '');
    const paddedTarget = cleanAddressOnly.padStart(64, '0');

    let transferAmount = 0;

    for (const log of (receipt.logs || [])) {
      if (!log.topics || log.topics.length < 3) continue;

      const topic0 = (log.topics[0] || '').toLowerCase();
      if (topic0 !== TRANSFER_EVENT_TOPIC.toLowerCase()) continue;

      const recipientTopic = (log.topics[2] || '').toLowerCase().replace(/^0x/, '').padStart(64, '0');
      if (recipientTopic === paddedTarget) {
        const logContract = (log.address || '').toLowerCase();
        let decimals = 18;
        if (chain === 'polygon' || logContract === USDT_CONTRACTS.polygon.toLowerCase()) {
          decimals = 6;
        }

        try {
          const rawVal = BigInt(log.data || '0x0');
          const divisor = BigInt(10 ** decimals);
          const whole = rawVal / divisor;
          const frac = rawVal % divisor;
          const fracStr = frac.toString().padStart(decimals, '0').slice(0, 4);
          transferAmount = parseFloat(`${whole}.${fracStr}`);
          return {
            canVerify: true,
            verified: true,
            chain,
            amount: transferAmount,
            txHash: cleanTx
          };
        } catch (e: any) {
          console.error('Error parsing token amount:', e.message);
        }
      }
    }

    // Fallback: Check if native coin transfer
    const tx = await callRpc(chain, 'eth_getTransactionByHash', [cleanTx]);
    if (tx && tx.to && tx.to.toLowerCase() === targetAddress) {
      try {
        const rawWei = BigInt(tx.value || '0x0');
        const divisor = BigInt(10 ** 18);
        const whole = rawWei / divisor;
        const frac = rawWei % divisor;
        const fracStr = frac.toString().padStart(18, '0').slice(0, 4);
        const nativeAmount = parseFloat(`${whole}.${fracStr}`);
        if (nativeAmount > 0) {
          return {
            canVerify: true,
            verified: true,
            chain,
            amount: nativeAmount,
            txHash: cleanTx
          };
        }
      } catch {}
    }

    return {
      canVerify: true,
      verified: false,
      reason: `Transaction succeeded on ${chain.toUpperCase()}, but no transfer to address ${targetAddress} was found in the transaction logs.`
    };
  } catch (err: any) {
    return {
      canVerify: false,
      reason: `RPC network error: ${err.message}`
    };
  }
}
