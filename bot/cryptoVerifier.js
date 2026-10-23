/**
 * On-Chain Blockchain Transaction Verifier for NURMS Telegram Bot
 * Supports BSC (BEP20 USDT) and Polygon (Polygon USDT) via native JSON-RPC
 */

// Public RPC endpoints with fallback
const RPC_ENDPOINTS = {
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

// Known USDT Contract Addresses
const USDT_CONTRACTS = {
  bsc: '0x55d398326f99059ff775485246999027b3197955',     // 18 decimals
  polygon: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f' // 6 decimals
};

// ERC20 Transfer event signature: Transfer(address,address,uint256)
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * Determine blockchain network from gateway config
 */
function detectChain(gateway) {
  const str = `${gateway.id || ''} ${gateway.network || ''} ${gateway.name || ''}`.toLowerCase();
  if (str.includes('polygon') || str.includes('matic')) return 'polygon';
  if (str.includes('bep20') || str.includes('bsc') || str.includes('binance smart chain')) return 'bsc';
  return null;
}

/**
 * Perform JSON-RPC call with fallback endpoints
 */
async function callRpc(chain, method, params = []) {
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
    } catch (e) {
      // Try next endpoint on network timeout/error
    }
  }
  return null;
}

/**
 * Verify an on-chain transaction hash
 * @param {Object} gateway - Gateway configuration from Firebase
 * @param {string} txHash - User submitted transaction hash (0x...)
 * @returns {Promise<Object>} Verification outcome
 */
async function verifyOnChainTx(gateway, txHash) {
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
      reason: `Automated on-chain verification is only active for BEP20 and Polygon networks.`
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
    // 1. Fetch transaction receipt
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

    // Normalized recipient format (padded to 64 hex characters)
    const cleanAddressOnly = targetAddress.replace(/^0x/, '');
    const paddedTarget = cleanAddressOnly.padStart(64, '0');

    // 2. Scan logs for ERC-20 Transfer to our deposit address
    let foundTransfer = null;
    let transferAmount = 0;

    for (const log of (receipt.logs || [])) {
      if (!log.topics || log.topics.length < 3) continue;

      const topic0 = (log.topics[0] || '').toLowerCase();
      if (topic0 !== TRANSFER_EVENT_TOPIC.toLowerCase()) continue;

      // topics[2] is recipient 'to'
      const recipientTopic = (log.topics[2] || '').toLowerCase().replace(/^0x/, '').padStart(64, '0');
      if (recipientTopic === paddedTarget) {
        // Matched target recipient!
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
          foundTransfer = {
            tokenContract: logContract,
            amount: transferAmount,
            decimals
          };
          break;
        } catch (e) {
          console.error('Error parsing token amount:', e.message);
        }
      }
    }

    if (foundTransfer && transferAmount > 0) {
      return {
        canVerify: true,
        verified: true,
        chain,
        amount: transferAmount,
        tokenContract: foundTransfer.tokenContract,
        txHash: cleanTx
      };
    }

    // 3. Fallback: Check if it was a native coin transfer (BNB or MATIC/POL)
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
            native: true,
            txHash: cleanTx
          };
        }
      } catch (e) {}
    }

    return {
      canVerify: true,
      verified: false,
      reason: `Transaction succeeded on ${chain.toUpperCase()}, but no transfer to address ${targetAddress} was found in the transaction logs.`
    };
  } catch (err) {
    return {
      canVerify: false,
      reason: `RPC network error: ${err.message}`
    };
  }
}

module.exports = {
  detectChain,
  verifyOnChainTx
};
