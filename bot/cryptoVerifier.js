/**
 * On-Chain Blockchain Transaction Verifier for NURMS Telegram Bot
 * Supports BSC (BEP20 USDT) and Polygon (Polygon USDT) via native JSON-RPC
 * Enforces strict 12-minute transaction age limit and official USDT contract checks
 */

// Public RPC endpoints with fallback
const RPC_ENDPOINTS = {
  bsc: [
    'https://bsc-dataseed.binance.org/',
    'https://bsc-dataseed1.binance.org/',
    'https://bsc-dataseed1.defibit.io/',
    'https://bsc-dataseed1.ninicoin.io/'
  ],
  polygon: [
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon-rpc.com',
    'https://1rpc.io/matic'
  ]
};

// Known Official USDT Contract Addresses
const USDT_CONTRACTS = {
  bsc: '0x55d398326f99059ff775485246999027b3197955',     // BSC-USD (USDT) 18 decimals
  polygon: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f' // Polygon Tether (USDT) 6 decimals
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
 * Perform JSON-RPC call with fallback endpoints (ultra-fast timeout for <3s SLA)
 */
async function callRpc(chain, method, params = []) {
  const endpoints = RPC_ENDPOINTS[chain] || [];
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
        signal: AbortSignal.timeout(2500)
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data && data.result !== undefined) {
        return data.result;
      }
    } catch (e) {
      // Continue to next endpoint immediately
    }
  }
  return null;
}

/**
 * Verify an on-chain transaction hash
 * @param {Object} gateway - Gateway configuration from Firebase
 * @param {string} txHash - User submitted transaction hash (0x...)
 * @param {number} maxAgeMinutes - Maximum age in minutes (default 12 minutes)
 * @returns {Promise<Object>} Verification outcome
 */
async function verifyOnChainTx(gateway, txHash, maxAgeMinutes = 12) {
  const cleanTx = (txHash || '').trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(cleanTx)) {
    return {
      canVerify: false,
      invalidFormat: true,
      reason: 'Transaction ID is not a valid 66-character EVM hexadecimal hash.'
    };
  }

  const chain = detectChain(gateway);
  if (!chain) {
    return {
      canVerify: false,
      unsupportedChain: true,
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
    // 1. Fetch transaction receipt
    const receipt = await callRpc(chain, 'eth_getTransactionReceipt', [cleanTx]);

    if (!receipt) {
      return {
        canVerify: true,
        verified: false,
        pending: true,
        reason: 'Transaction not found in mined blocks yet. It may still be broadcasting or confirming on the blockchain. Please wait a moment and try again.'
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

    // 2. Fetch block timestamp & verify transaction age (within last 12 minutes)
    let blockTime = 0;
    let ageMinutes = 0;
    try {
      const block = await callRpc(chain, 'eth_getBlockByNumber', [receipt.blockNumber, false]);
      if (block && block.timestamp) {
        blockTime = parseInt(block.timestamp, 16);
        const nowSec = Math.floor(Date.now() / 1000);
        const diffSec = Math.max(0, nowSec - blockTime);
        ageMinutes = diffSec / 60;
      }
    } catch (e) {
      console.warn('Could not fetch block timestamp:', e.message);
    }

    if (blockTime > 0 && ageMinutes > maxAgeMinutes) {
      return {
        canVerify: true,
        verified: false,
        expired: true,
        ageMinutes: Math.round(ageMinutes),
        blockTime: new Date(blockTime * 1000).toISOString(),
        reason: `Transaction is too old (${Math.round(ageMinutes)} mins ago). Only payments made within the last ${maxAgeMinutes} minutes are accepted.`
      };
    }

    // Normalized recipient format (padded to 64 hex characters)
    const cleanAddressOnly = targetAddress.replace(/^0x/, '');
    const paddedTarget = cleanAddressOnly.padStart(64, '0');

    // 3. Scan logs for ERC-20 / BEP-20 Transfer to our deposit address
    let foundTransfer = null;
    let transferAmount = 0;
    const isUsdtGateway = `${gateway.id || ''} ${gateway.name || ''} ${gateway.currency || ''}`.toLowerCase().includes('usdt');

    for (const log of (receipt.logs || [])) {
      if (!log.topics || log.topics.length < 3) continue;

      const topic0 = (log.topics[0] || '').toLowerCase();
      if (topic0 !== TRANSFER_EVENT_TOPIC.toLowerCase()) continue;

      // topics[2] is recipient 'to'
      const recipientTopic = (log.topics[2] || '').toLowerCase().replace(/^0x/, '').padStart(64, '0');
      if (recipientTopic === paddedTarget) {
        const logContract = (log.address || '').toLowerCase();

        // Enforce genuine USDT contract verification if this is a USDT gateway
        if (isUsdtGateway && USDT_CONTRACTS[chain]) {
          if (logContract !== USDT_CONTRACTS[chain].toLowerCase()) {
            continue; // Not the official USDT contract
          }
        }

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
        ageMinutes: Math.round(ageMinutes),
        tokenContract: foundTransfer.tokenContract,
        txHash: cleanTx
      };
    }

    // 4. Fallback: Check if it was a native coin transfer (BNB or MATIC) if not strictly a USDT gateway
    if (!isUsdtGateway) {
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
              ageMinutes: Math.round(ageMinutes),
              native: true,
              txHash: cleanTx
            };
          }
        } catch (e) {}
      }
    }

    return {
      canVerify: true,
      verified: false,
      wrongRecipient: true,
      ageMinutes: Math.round(ageMinutes),
      reason: `Transaction confirmed on ${chain.toUpperCase()}, but no payment to deposit address (${targetAddress}) was found.`
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
  verifyOnChainTx,
  USDT_CONTRACTS
};
