require('dotenv').config();
const { Bot } = require('grammy');
const express = require('express');
const { rtdb } = require('./firebase');
const { ref, get, set, update, onValue } = require('firebase/database');
const { verifyOnChainTx } = require('./cryptoVerifier');
const { verifyBinancePayment, verifyBybitPayment } = require('./exchangeVerifier');

// Default Token embedded so Render needs zero configuration!
const defaultToken = '8711373245:AAHZMSBwkhKrNjsyj5yQRYdw0E2YgVvpzWk';
let token = process.env.BOT_TOKEN || defaultToken;
if (token.includes('AAGRz0PbAJ9tzac3VVr8zg_UBrIloXCT_fg')) {
  token = defaultToken;
}

const bot = new Bot(token);

// Default Bot Settings (Configured to user's exact channels)
let botConfig = {
  shopName: process.env.SHOP_NAME || 'Nurms Shop',
  channelId: process.env.CHANNEL_ID || '@owloverdown',
  channelLink: process.env.CHANNEL_LINK || 'https://t.me/owloverdown',
  botLink: process.env.BOT_LINK || '@NurmsBOT',
  supportUsername: process.env.SUPPORT_USERNAME || '@owloverdown',

  // 24/7 Uptime & Cron Settings
  selfPingUrl: '', // e.g., 'https://nurmsbot.onrender.com'
  enableSelfPing: true,
  pingIntervalMinutes: 10,

  bkashNumber: '01XXXXXXXXX',
  nagadNumber: '01XXXXXXXXX',
  binancePayId: '12345678',

  forceSubMessage: '👋 Hey! {name} Please Join our Official channel to access this bot ❗',
  joinChannelBtnText: '▶️ {shop_name}',
  verifyJoinedBtnText: '✨ I Have Joined',

  welcomeMessage: 'Welcome to {shop_name} 🎉\n👋 Hello! {name}\n\n📌 Account Details\n💳 Telegram ID: {user_id}\n💰 Balance: ${balance}\n\nChoose below 🔹',
  shopMessage: '🛒 Available Products\n⬇️ Choose an option to buy:',
  walletMessage: '💲 Wallet\n\n🪙 Current Balance: ${balance}\n\n"You can add balance to your wallet and use it to purchase products directly!"',

  btnShopText: '🛒 Shop',
  btnShopStyle: 'primary',
  btnWalletText: '💰 Wallet',
  btnWalletStyle: 'primary',
  btnOrderHistoryText: '🧾 Order History',
  btnOrderHistoryStyle: 'primary',
  btnMyOrdersText: '📦 My Orders',
  btnMyOrdersStyle: 'primary',
  btnReferText: '💸 Refer & Earn',
  btnReferStyle: 'success',
  btnProfileText: '🛡️ Profile',
  btnProfileStyle: 'primary',
  btnSupportText: '🗣️ Support',
  btnSupportStyle: 'success',
  btnAboutText: 'ℹ️ About',
  btnAboutStyle: 'primary',

  // Referral Program & Commission
  enableReferralReward: true,
  referralCommission: 0.10, // $0.10 USD bonus per referred user who joins the bot
  referralWelcomeBonus: 0.00, // Optional welcome bonus for the joining user
  referralPurchaseCommissionPercent: 0, // Optional % commission on referred user purchases
};

// Sync settings dynamically from Firebase Realtime Database
if (rtdb) {
  try {
    const configRef = ref(rtdb, 'settings/bot_config');
    onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        botConfig = {
          ...botConfig,
          ...data,
        };
        console.log('🔄 Realtime Bot Configuration Synced from Firebase RTDB!');
      }
    });
  } catch (err) {
    console.error('⚠️ Could not listen to settings in RTDB:', err.message);
  }
}

// Template variable replacement helper
function formatText(template, variables = {}) {
  if (!template) return '';
  let result = template;
  for (const [key, val] of Object.entries(variables)) {
    result = result.replaceAll(`{${key}}`, String(val));
  }
  return result;
}

// Helper: Get or Create User in Firebase RTDB with Instant Referral Join Commission
async function getUser(userId, userInfo = {}, referrerId = null, ctx = null) {
  const userRef = ref(rtdb, `users/${userId}`);
  const snap = await get(userRef);

  if (!snap.exists()) {
    const newUser = {
      telegram_id: String(userId),
      name: userInfo.first_name || 'User',
      username: userInfo.username || '',
      balance: 0.0,
      referralCount: 0,
      referralEarnings: 0.0,
      referredBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Process Referral Bonus if valid referrer is provided
    if (referrerId && String(referrerId) !== String(userId)) {
      try {
        const cleanRefId = String(referrerId);
        const refUserRef = ref(rtdb, `users/${cleanRefId}`);
        const refSnap = await get(refUserRef);

        if (refSnap.exists()) {
          const referrerData = refSnap.val();
          newUser.referredBy = cleanRefId;

          const commission = Number(botConfig.referralCommission ?? 0.10);
          const isEnabled = botConfig.enableReferralReward !== false;

          if (isEnabled && commission > 0) {
            const updatedRefBalance = Number((Number(referrerData.balance || 0) + commission).toFixed(2));
            const updatedRefCount = Number(referrerData.referralCount || 0) + 1;
            const updatedRefEarnings = Number((Number(referrerData.referralEarnings || 0) + commission).toFixed(2));

            // 1. Credit Referrer's Wallet & Referral Stats
            await update(refUserRef, {
              balance: updatedRefBalance,
              referralCount: updatedRefCount,
              referralEarnings: updatedRefEarnings,
              updatedAt: new Date().toISOString(),
            });

            // 2. Record in referrals ledger
            await set(ref(rtdb, `referrals/${cleanRefId}/${userId}`), {
              telegram_id: String(userId),
              name: userInfo.first_name || 'Member',
              username: userInfo.username || '',
              commission: commission,
              joinedAt: new Date().toISOString(),
            });

            // 3. Record Financial Ledger Transaction
            await recordTransaction({
              type: 'referral_bonus',
              userId: cleanRefId,
              userName: referrerData.name || 'Referrer',
              amount: commission,
              balanceAfter: updatedRefBalance,
              note: `Referral join bonus: invited ${userInfo.first_name || 'Member'} (${userId})`,
            });

            // 4. Send Instant Realtime Notification to Referrer
            if (ctx && ctx.api) {
              try {
                await ctx.api.sendMessage(
                  cleanRefId,
                  `🎉 *New Referral Join Bonus!*\n\n` +
                  `👤 *${userInfo.first_name || 'A new friend'}* just joined using your referral link!\n\n` +
                  `💰 *Commission Earned:* +$${commission.toFixed(2)}\n` +
                  `🪙 *Updated Wallet Balance:* $${updatedRefBalance.toFixed(2)}\n` +
                  `👥 *Total Referrals:* ${updatedRefCount}\n\n` +
                  `_Keep sharing your link to earn unlimited wallet balance!_`,
                  { parse_mode: 'Markdown' }
                );
              } catch (notifyErr) {
                console.warn(`Could not send referral notification to ${cleanRefId}:`, notifyErr.message);
              }
            }
          }

          // Optional welcome bonus for joining user
          const welcomeBonus = Number(botConfig.referralWelcomeBonus || 0);
          if (isEnabled && welcomeBonus > 0) {
            newUser.balance = welcomeBonus;
            await recordTransaction({
              type: 'welcome_bonus',
              userId: String(userId),
              userName: newUser.name,
              amount: welcomeBonus,
              balanceAfter: welcomeBonus,
              note: `Welcome bonus for joining via referral (${cleanRefId})`,
            });
          }
        }
      } catch (refErr) {
        console.error('Error processing referral bonus in RTDB:', refErr.message);
      }
    }

    await set(userRef, newUser);
    return newUser;
  }

  const existingUser = snap.val();
  if (userInfo.first_name && existingUser.name !== userInfo.first_name) {
    await update(userRef, {
      name: userInfo.first_name,
      username: userInfo.username || '',
      updatedAt: new Date().toISOString(),
    });
  }
  return existingUser;
}

// Helper: Check if user joined the official channel
async function isChannelMember(ctx, userId) {
  if (!botConfig.channelId || botConfig.channelId.trim() === '') return true;
  try {
    const member = await ctx.api.getChatMember(botConfig.channelId, userId);
    const validStatuses = ['creator', 'administrator', 'member', 'restricted'];
    return validStatuses.includes(member.status);
  } catch (err) {
    console.warn(`⚠️ Chat member check for ${userId} in ${botConfig.channelId}:`, err.message);
    // If bot is not an administrator in the channel, Telegram throws:
    // "chat not found" or "bot is not a member of the channel chat"
    // In this case, allow access so the bot is not completely bricked until added as admin
    if (err.message && (err.message.includes('not a member') || err.message.includes('chat not found') || err.message.includes('member list is inaccessible'))) {
      console.warn(`👉 Reminder: Add your bot as Administrator in ${botConfig.channelId} for strict channel enforcement.`);
      return true;
    }
    return false;
  }
}

// Helper: Create Inline Keyboard with Native Telegram API button styles & copy_text & custom_emoji
function createStyledKeyboard(rows) {
  const inline_keyboard = rows.map((row) =>
    row.map((btn) => {
      const buttonObj = { text: btn.text };
      if (btn.url) buttonObj.url = btn.url;
      if (btn.callback_data) buttonObj.callback_data = btn.callback_data;
      if (btn.copy_text) buttonObj.copy_text = btn.copy_text;
      if (btn.style) buttonObj.style = btn.style;
      if (btn.icon_custom_emoji_id) buttonObj.icon_custom_emoji_id = String(btn.icon_custom_emoji_id);
      return buttonObj;
    })
  );
  return { inline_keyboard };
}

// Helper: Record financial ledger transaction in Firebase RTDB
async function recordTransaction(txData) {
  try {
    const randomKey = Math.floor(100000 + Math.random() * 900000);
    const txId = txData.id || `tx_${Date.now()}_${randomKey}`;
    await set(ref(rtdb, `transactions/${txId}`), {
      id: txId,
      ...txData,
      createdAt: txData.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to record transaction in RTDB:', err.message);
  }
}

// Comprehensive SVG Brand Presets & Emojis to Telegram Button Label Resolver
const BRAND_ICON_MAP = {
  // AI Tools
  gemini: '✨',
  bard: '✨',
  chatgpt: '🤖',
  openai: '🤖',
  gpt: '🤖',
  claude: '🧠',
  anthropic: '🧠',
  cursor: '💻',
  copilot: '💻',
  midjourney: '🎨',
  dalle: '🎨',
  runway: '🎥',
  elevenlabs: '🎙️',
  perplexity: '🔍',

  // Streaming & Media
  netflix: '🎬',
  spotify: '🎧',
  youtube: '▶️',
  yt: '▶️',
  prime: '📦',
  amazon: '📦',
  disney: '🏰',
  hbo: '🍿',
  crunchyroll: '🍥',
  apple: '🍏',
  applemusic: '🎵',
  itunes: '🎵',
  deezer: '🎶',
  tidal: '🎶',

  // Social, Gaming & Dev Tools
  telegram: '⭐',
  tg: '⭐',
  discord: '👾',
  github: '🐙',
  gitlab: '🦊',
  canva: '🎨',
  tradingview: '📈',
  vpn: '🛡️',
  nordvpn: '🛡️',
  expressvpn: '🛡️',
  surfshark: '🦈',
  steam: '🎮',
  playstation: '🎮',
  xbox: '🎮',
  roblox: '🧱',
  minecraft: '⛏️',

  // Crypto Gateways & Tokens
  binance: '🔸',
  bnb: '🔸',
  bybit: '🟡',
  usdt: '🟢',
  tether: '🟢',
  bep20: '🟡',
  bsc: '🟡',
  trc20: '🔴',
  tron: '🔴',
  trx: '🔴',
  polygon: '🟣',
  matic: '🟣',
  ton: '💎',
  toncoin: '💎',
  btc: '₿',
  bitcoin: '₿',
  eth: 'Ξ',
  ethereum: 'Ξ',
  ltc: 'Ł',
  litecoin: 'Ł',
  sol: '🟣',
  solana: '🟣',

  // Local Mobile Banking & Fiat
  bkash: '🌸',
  nagad: '🟠',
  rocket: '🚀',
  upay: '📱',
  cellfin: '🏦',
  bank: '🏦',
  visa: '💳',
  mastercard: '💳',
  paypal: '🅿️',
  stripe: '💳',
};

function getButtonIcon(icon, fallbackName = '') {
  const clean = String(icon || '').trim();

  // 1. Direct Emoji Check (single emoji character or unicode symbol)
  if (clean && !clean.startsWith('<') && !clean.startsWith('http')) {
    const lowerKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (BRAND_ICON_MAP[lowerKey]) {
      return BRAND_ICON_MAP[lowerKey];
    }
    for (const [key, emoji] of Object.entries(BRAND_ICON_MAP)) {
      if (lowerKey === key || lowerKey.includes(key)) {
        return emoji;
      }
    }
    // Check if it's already an emoji (e.g. 🤖, 🎬, ✨, 💎, 🔥, ⚡, 👑)
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u;
    if (emojiRegex.test(clean)) {
      const match = clean.match(emojiRegex);
      if (match) return match[0];
      return clean;
    }
    if (clean.length <= 2) {
      return clean;
    }
  }

  // 2. If raw SVG XML was pasted into admin panel (<svg ...>)
  if (clean.startsWith('<svg') || clean.startsWith('<?xml') || clean.includes('<path')) {
    const lowerSvg = clean.toLowerCase();
    for (const [key, emoji] of Object.entries(BRAND_ICON_MAP)) {
      if (lowerSvg.includes(key)) {
        return emoji;
      }
    }
  }

  // 3. Fallback: Automatically detect brand icon from the product or gateway name!
  if (fallbackName) {
    const lowerName = String(fallbackName).toLowerCase();
    for (const [key, emoji] of Object.entries(BRAND_ICON_MAP)) {
      if (lowerName.includes(key)) {
        return emoji;
      }
    }
  }

  return clean && clean.length <= 4 ? clean : '✨';
}

// Default Presets for Payment Gateways
const DEFAULT_GATEWAYS = [
  {
    id: 'usdt-bep20',
    name: 'USDT (BEP20)',
    icon: 'usdt',
    type: 'crypto_address',
    currency: 'USDT',
    network: 'BSC (BEP20)',
    minDeposit: '0.01 USDT',
    maxDeposit: '10000.00 USDT',
    address: '0xAfCdaAfA2e75A543B2A120c31a05708982Bd4b7F',
    warning: 'Only send USDT on BEP20 (BSC) network. Sending other tokens or using wrong network will result in loss of funds.',
    active: true,
  },
  {
    id: 'usdt-polygon',
    name: 'USDT (Polygon)',
    icon: 'polygon',
    type: 'crypto_address',
    currency: 'USDT',
    network: 'Polygon',
    minDeposit: '0.01 USDT',
    maxDeposit: '10000.00 USDT',
    address: '0xAfCdaAfA2e75A543B2A120c31a05708982Bd4b7F',
    warning: 'Only send USDT on Polygon network. Sending other tokens or using wrong network will result in loss of funds.',
    active: true,
  },
  {
    id: 'usdt-ton',
    name: 'USDT (Ton)',
    icon: 'ton',
    type: 'crypto_address',
    currency: 'USDT',
    network: 'TON',
    minDeposit: '0.10 USDT',
    maxDeposit: '10000.00 USDT',
    address: 'EQB_YourTonDepositAddressHere1234567890',
    warning: 'Send only USDT on TON network.',
    active: true,
  },
  {
    id: 'ton-ton',
    name: 'Ton (Ton)',
    icon: 'ton',
    type: 'crypto_address',
    currency: 'TON',
    network: 'TON',
    minDeposit: '0.10 TON',
    maxDeposit: '5000.00 TON',
    address: 'EQB_YourTonDepositAddressHere1234567890',
    warning: 'Send only TON coin to this address.',
    active: true,
  },
  {
    id: 'binance-pay',
    name: 'Binance Pay',
    icon: 'binance',
    type: 'uid',
    currency: 'USDT',
    network: 'Binance Pay',
    minDeposit: '0.01 USDT',
    maxDeposit: '5.00 USDT',
    uid: '1233668018',
    warning: 'For more than 5.00 USDT, please use one of the other payment methods — they are credited automatically. Send only USDT via Binance Pay to the ID above.',
    active: true,
    autoApprove: true,
    autoApproveAmount: 5.0,
  },
  {
    id: 'bybit-pay',
    name: 'Bybit Pay',
    icon: 'bybit',
    type: 'uid',
    currency: 'USDT',
    network: 'Bybit UID',
    minDeposit: '0.01 USDT',
    maxDeposit: '100.00 USDT',
    uid: '987654321',
    warning: 'Send USDT via Bybit internal transfer to the UID above and submit your Transaction ID.',
    active: true,
    autoApprove: true,
    autoApproveAmount: 5.0,
  },
  {
    id: 'ltc',
    name: 'LTC (Litecoin)',
    icon: 'ltc',
    type: 'crypto_address',
    currency: 'LTC',
    network: 'Litecoin',
    minDeposit: '0.001 LTC',
    maxDeposit: '100.00 LTC',
    address: 'ltc1qYourLitecoinAddressHere1234567890',
    warning: 'Send only Litecoin (LTC) to this address.',
    active: true,
  },
];

async function getGateways() {
  try {
    const snap = await get(ref(rtdb, 'gateways'));
    if (snap.exists()) {
      const val = snap.val();
      const list = [];
      for (const [key, item] of Object.entries(val)) {
        if (item.active !== false) {
          list.push({ id: key, ...item });
        }
      }
      if (list.length > 0) {
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        return list;
      }
    }
  } catch (err) {
    console.warn('⚠️ Error fetching gateways from RTDB:', err.message);
  }
  return DEFAULT_GATEWAYS;
}

async function getGateway(id) {
  try {
    const snap = await get(ref(rtdb, `gateways/${id}`));
    if (snap.exists()) {
      return { id, ...snap.val() };
    }
  } catch (e) {}
  return DEFAULT_GATEWAYS.find((g) => g.id === id) || null;
}

// In-memory session state for awaiting TxID submissions
const userSessions = new Map();

// 1. /start Command Handler
bot.command('start', async (ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name || 'Member';

  // Parse referral payload from deep-link (e.g. /start 123456 or /start ref_123456)
  const rawPayload = ctx.match || (ctx.message?.text ? ctx.message.text.split(' ')[1] : '');
  let referrerId = null;
  if (rawPayload) {
    const cleaned = String(rawPayload).replace(/^ref_/, '').trim();
    if (/^\d+$/.test(cleaned) && cleaned !== String(userId)) {
      referrerId = cleaned;
    }
  }

  // Ensure user exists in Firebase & handle referral join commission
  const user = await getUser(userId, ctx.from, referrerId, ctx);

  // Check channel subscription
  const joined = await isChannelMember(ctx, userId);

  if (!joined) {
    // Show Join Verification Screen (Image 1)
    const text = formatText(botConfig.forceSubMessage, {
      name: firstName,
      shop_name: botConfig.shopName,
    });

    const reply_markup = createStyledKeyboard([
      [
        {
          text: formatText(botConfig.joinChannelBtnText, { shop_name: botConfig.shopName }),
          url: botConfig.channelLink,
          style: 'primary',
        },
      ],
      [
        {
          text: botConfig.verifyJoinedBtnText,
          callback_data: 'verify_joined',
          style: 'success',
        },
      ],
    ]);

    return ctx.reply(text, { reply_markup });
  }

  // If joined, show Main Menu (Image 2)
  renderMainMenu(ctx, user);
});

// Helper: Render Main Menu (Image 2)
function renderMainMenu(ctx, user, isEdit = false) {
  const balance = Number(user.balance || 0).toFixed(2);
  const text = formatText(botConfig.welcomeMessage, {
    name: user.name || 'Member',
    shop_name: botConfig.shopName,
    user_id: user.telegram_id,
    balance: balance,
  });

  const reply_markup = createStyledKeyboard([
    [
      { text: botConfig.btnShopText, callback_data: 'menu_shop', style: botConfig.btnShopStyle || 'primary' },
      { text: botConfig.btnWalletText, callback_data: 'menu_wallet', style: botConfig.btnWalletStyle || 'primary' },
    ],
    [
      { text: botConfig.btnOrderHistoryText, callback_data: 'menu_orders', style: botConfig.btnOrderHistoryStyle || 'primary' },
      { text: botConfig.btnMyOrdersText, callback_data: 'menu_orders', style: botConfig.btnMyOrdersStyle || 'primary' },
    ],
    [
      { text: botConfig.btnReferText, callback_data: 'menu_refer', style: botConfig.btnReferStyle || 'success' },
      { text: botConfig.btnProfileText, callback_data: 'menu_profile', style: botConfig.btnProfileStyle || 'primary' },
    ],
    [
      {
        text: botConfig.btnSupportText,
        url: `https://t.me/${botConfig.supportUsername.replace('@', '')}`,
        style: botConfig.btnSupportStyle || 'success',
      },
      { text: botConfig.btnAboutText, callback_data: 'menu_about', style: botConfig.btnAboutStyle || 'primary' },
    ],
  ]);

  if (isEdit) {
    return ctx.editMessageText(text, { reply_markup }).catch(() => ctx.reply(text, { reply_markup }));
  }
  return ctx.reply(text, { reply_markup });
}

// 2. "I Have Joined" Verification Callback Handler
bot.callbackQuery('verify_joined', async (ctx) => {
  const userId = ctx.from.id;
  const joined = await isChannelMember(ctx, userId);

  if (!joined) {
    return ctx.answerCallbackQuery({
      text: '❌ You have not joined the channel yet! Please join our channel first.',
      show_alert: true,
    });
  }

  await ctx.answerCallbackQuery({ text: '✅ Verification successful! Welcome.' });
  const user = await getUser(userId, ctx.from);
  renderMainMenu(ctx, user, true);
});

// 3. Back to Main Menu Handler
bot.callbackQuery('back_to_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);
  renderMainMenu(ctx, user, true);
});

// 4. Shop Menu Handler (Image 3 - with Red/Green stock buttons!)
bot.callbackQuery('menu_shop', async (ctx) => {
  await ctx.answerCallbackQuery();

  let products = [];
  try {
    const snap = await get(ref(rtdb, 'products'));
    if (snap.exists()) {
      const val = snap.val();
      for (const [key, item] of Object.entries(val)) {
        if (item.active !== false) {
          products.push({ id: key, ...item });
        }
      }
    }
  } catch (err) {
    console.error('Error fetching products from RTDB:', err.message);
  }

  const text = formatText(botConfig.shopMessage, { shop_name: botConfig.shopName });
  const rows = [];

  products.forEach((prod) => {
    const isAvailable = Number(prod.stock) > 0;
    const priceDisplay = Number(prod.price) === 0 ? '0' : `$${prod.price}`;
    const customEmojiId = prod.custom_emoji_id || (prod.icon && /^\d{10,}$/.test(String(prod.icon).trim()) ? String(prod.icon).trim() : null);
    const icon = customEmojiId ? '' : getButtonIcon(prod.icon || prod.emoji, prod.name);
    const label = `${icon ? `${icon} ` : ''}${prod.name} - ${priceDisplay}`;

    const btnObj = {
      text: label,
      callback_data: `prod_${prod.id}`,
      style: isAvailable ? 'success' : 'danger',
    };
    if (customEmojiId) {
      btnObj.icon_custom_emoji_id = String(customEmojiId);
    }

    rows.push([btnObj]);
  });

  rows.push([
    {
      text: '◀️ Back to Menu',
      callback_data: 'back_to_menu',
      style: 'primary',
    },
  ]);

  const reply_markup = createStyledKeyboard(rows);

  try {
    await ctx.editMessageText(text, { reply_markup });
  } catch (err) {
    await ctx.reply(text, { reply_markup });
  }
});

// 5. Helper: Render Product Detail with Interactive Dynamic Stock/Quantity Selector
async function renderProductDetail(ctx, prodId, quantity = 1, isEdit = true) {
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);

  let product = null;
  const snap = await get(ref(rtdb, `products/${prodId}`));
  if (snap.exists()) {
    product = { id: prodId, ...snap.val() };
  }

  if (!product) {
    product = {
      id: prodId,
      name: prodId.replace(/-/g, ' ').toUpperCase(),
      price: 0,
      stock: 10,
      description: 'Instant automated delivery. 30 Days Replacement Warranty.',
    };
  }

  const stock = Math.max(0, parseInt(product.stock, 10) || 0);
  const inStock = stock > 0;
  const currentQty = inStock ? Math.max(1, Math.min(stock, parseInt(quantity, 10) || 1)) : 0;
  const unitPrice = Number(product.price || 0);
  const totalPrice = unitPrice * currentQty;
  const userBalance = Number(user.balance || 0);
  const hasFunds = userBalance >= totalPrice;
  const balanceAfter = userBalance - totalPrice;
  const shortfall = totalPrice - userBalance;

  const prodIcon = getButtonIcon(product.icon || product.emoji, product.name);

  let text = `${prodIcon ? `${prodIcon} ` : '📦 '}*${product.name}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📝 *Description:*\n${product.description || 'Premium digital product with 30-day automated replacement warranty.'}\n\n` +
    `📊 *Order Specifications:*\n` +
    `• 🏷️ Available Stock: *${inStock ? `${stock} pcs in stock` : '❌ Out of Stock'}*\n` +
    `• 💲 Unit Price: *$${unitPrice.toFixed(2)}*\n` +
    `• 🔢 Selected Quantity: *${currentQty} pcs*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Final Total Price:* *$${totalPrice.toFixed(2)}*\n` +
    `🪙 *Your Wallet Balance:* *$${userBalance.toFixed(2)}*\n`;

  if (!inStock) {
    text += `⚠️ *Item Unavailable:* Currently out of stock. Please check back later.\n`;
  } else if (hasFunds) {
    text += `💳 *Wallet Balance After Purchase:* *$${balanceAfter.toFixed(2)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ *Funds Ready!* Adjust quantity below or click to confirm and receive instant credentials:`;
  } else {
    text += `⚠️ *Insufficient Wallet Balance!* Shortfall: *+$${shortfall.toFixed(2)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 *Top-up Required:* Please deposit *$${shortfall.toFixed(2)}* or reduce quantity to continue.`;
  }

  const rows = [];

  if (inStock) {
    // Row 1: Quantity Increment / Decrement
    const decQty = Math.max(1, currentQty - 1);
    const incQty = Math.min(stock, currentQty + 1);
    rows.push([
      { text: '➖ 1', callback_data: `qty_${product.id}_${decQty}`, style: 'primary' },
      { text: `📦 ${currentQty} pcs`, callback_data: 'noop', style: 'primary' },
      { text: '➕ 1', callback_data: `qty_${product.id}_${incQty}`, style: 'primary' },
    ]);

    // Row 2: Quick Jump & Custom Input
    const quickRow = [];
    if (stock >= 5) {
      quickRow.push({ text: '+5', callback_data: `qty_${product.id}_${Math.min(stock, currentQty + 5)}`, style: 'primary' });
    }
    if (stock >= 10) {
      quickRow.push({ text: '+10', callback_data: `qty_${product.id}_${Math.min(stock, currentQty + 10)}`, style: 'primary' });
    }
    quickRow.push({ text: `⚡ Max (${stock})`, callback_data: `qty_${product.id}_${stock}`, style: 'primary' });
    quickRow.push({ text: '✏️ Custom', callback_data: `custom_qty_${product.id}`, style: 'primary' });
    rows.push(quickRow);

    // Row 3: Action Button (Buy or Deposit)
    if (hasFunds) {
      rows.push([
        {
          text: `⚡ Buy ${currentQty} pcs • $${totalPrice.toFixed(2)}`,
          callback_data: `buy_${product.id}_${currentQty}`,
          style: 'success',
        },
      ]);
    } else {
      rows.push([
        {
          text: `💰 Deposit Funds (+$${shortfall.toFixed(2)})`,
          callback_data: 'wallet_deposit',
          style: 'success',
        },
      ]);
    }
  }

  // Row 4: Navigation
  rows.push([
    { text: '◀️ Back to Shop', callback_data: 'menu_shop', style: 'primary' },
    { text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' },
  ]);

  const reply_markup = createStyledKeyboard(rows);

  if (isEdit) {
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
    } catch {
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
    }
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
  }
}

// 5.1 Noop handler for static display buttons
bot.callbackQuery('noop', async (ctx) => {
  await ctx.answerCallbackQuery();
});

// 5.2 Product Detail Initial Entry Point (Default Quantity: 1)
bot.callbackQuery(/^prod_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const prodId = ctx.match[1];
  await renderProductDetail(ctx, prodId, 1, true);
});

// 5.3 Dynamic Quantity Adjuster Handler
bot.callbackQuery(/^qty_([^_]+)_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const prodId = ctx.match[1];
  const qty = parseInt(ctx.match[2], 10);
  await renderProductDetail(ctx, prodId, qty, true);
});

// 5.4 Custom Quantity Prompt Handler
bot.callbackQuery(/^custom_qty_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const prodId = ctx.match[1];
  const userId = ctx.from.id;

  let product = null;
  const snap = await get(ref(rtdb, `products/${prodId}`));
  if (snap.exists()) product = snap.val();
  const stock = Math.max(0, parseInt(product?.stock, 10) || 0);

  userSessions.set(userId, {
    awaitingCustomQtyFor: prodId,
    stock: stock,
    productName: product?.name || 'Product',
    timestamp: Date.now(),
  });

  const promptText = `✏️ *Enter Custom Quantity*\n\n` +
    `Product: *${product?.name || 'Product'}*\n` +
    `Available Stock: *${stock} pcs*\n` +
    `Unit Price: *$${Number(product?.price || 0).toFixed(2)}*\n\n` +
    `👇 *Please reply with the exact number of units you want to purchase (1 - ${stock}):*`;

  const reply_markup = createStyledKeyboard([
    [{ text: '❌ Cancel', callback_data: `prod_${prodId}`, style: 'danger' }],
  ]);

  try {
    await ctx.editMessageText(promptText, { parse_mode: 'Markdown', reply_markup });
  } catch {
    await ctx.reply(promptText, { parse_mode: 'Markdown', reply_markup });
  }
});

// 6. Buy Product Execution with Unique Order ID & Multi-Item Credentials Delivery
bot.callbackQuery(/^buy_([^_]+)(?:_(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const prodId = ctx.match[1];
  const qty = Math.max(1, parseInt(ctx.match[2] || '1', 10));
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);

  let product = null;
  const prodSnap = await get(ref(rtdb, `products/${prodId}`));
  if (prodSnap.exists()) {
    product = { id: prodId, ...prodSnap.val() };
  }

  if (!product) {
    return ctx.reply('❌ Product not found or unavailable!', {
      reply_markup: createStyledKeyboard([
        [{ text: '◀️ Back to Shop', callback_data: 'menu_shop', style: 'primary' }],
      ]),
    });
  }

  const stock = Math.max(0, parseInt(product.stock, 10) || 0);
  if (stock < qty) {
    return ctx.reply(`⚠️ *Stock Shortage!* Only *${stock} pcs* available in stock.`, {
      parse_mode: 'Markdown',
      reply_markup: createStyledKeyboard([
        [{ text: '🔄 Adjust Quantity', callback_data: `prod_${prodId}`, style: 'primary' }],
        [{ text: '◀️ Back to Shop', callback_data: 'menu_shop', style: 'primary' }],
      ]),
    });
  }

  const unitPrice = Number(product.price || 0);
  const totalPrice = unitPrice * qty;
  const currentBalance = Number(user.balance || 0);

  if (currentBalance < totalPrice) {
    const shortfall = totalPrice - currentBalance;
    const text = `❌ *Insufficient Balance*\n\n` +
      `Product: *${product.name}* (x${qty} pcs)\n` +
      `Total Price: *$${totalPrice.toFixed(2)}*\n` +
      `Your Current Balance: *$${currentBalance.toFixed(2)}*\n` +
      `Shortfall: *+$${shortfall.toFixed(2)}*\n\n` +
      `Please deposit funds to complete this purchase!`;

    const reply_markup = createStyledKeyboard([
      [{ text: `💰 Deposit +$${shortfall.toFixed(2)}`, callback_data: 'wallet_deposit', style: 'success' }],
      [{ text: '🔄 Adjust Quantity', callback_data: `prod_${prodId}`, style: 'primary' }],
      [{ text: '◀️ Back to Shop', callback_data: 'menu_shop', style: 'primary' }],
    ]);

    try {
      return await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
    } catch {
      return await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
    }
  }

  // 1. Generate Clean, Official Unique Order ID
  const orderNumber = Math.floor(100000 + Math.random() * 900000);
  const orderId = `ORD-${orderNumber}`;
  const formattedOrderId = `#${orderId}`;

  // 2. Intelligent Multi-Credential Extraction
  const rawPayload = product.payload || '';
  const lines = rawPayload.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let deliveredPayload = '';
  let remainingPayload = rawPayload;

  if (lines.length >= qty && lines.length > 1) {
    deliveredPayload = lines.slice(0, qty).join('\n');
    remainingPayload = lines.slice(qty).join('\n');
  } else if (lines.length > 0 && lines.length < qty) {
    deliveredPayload = lines.join('\n');
    remainingPayload = '';
  } else {
    deliveredPayload = rawPayload || 'Standard automated digital delivery confirmed. Contact support for warranty activation.';
  }

  // 3. Deduct balance & decrement stock
  const newBalance = currentBalance - totalPrice;
  const newStock = Math.max(0, stock - qty);

  await update(ref(rtdb, `users/${userId}`), {
    balance: newBalance,
    updatedAt: new Date().toISOString(),
  });

  await update(ref(rtdb, `products/${prodId}`), {
    stock: newStock,
    payload: remainingPayload,
    updatedAt: new Date().toISOString(),
  });

  // 4. Save Official Order in RTDB
  const orderData = {
    id: orderId,
    orderId: formattedOrderId,
    userId: String(userId),
    userName: user.name || ctx.from.first_name || 'Member',
    productId: product.id,
    productName: product.name,
    quantity: qty,
    unitPrice: unitPrice,
    totalPrice: totalPrice,
    price: totalPrice,
    payload: deliveredPayload,
    status: 'completed',
    balanceBefore: currentBalance,
    balanceAfter: newBalance,
    createdAt: new Date().toISOString(),
  };
  await set(ref(rtdb, `orders/${orderId}`), orderData);

  // 5. Record Financial Ledger Transaction
  await recordTransaction({
    type: 'purchase',
    orderId: formattedOrderId,
    userId: String(userId),
    userName: user.name || ctx.from.first_name || 'Member',
    amount: -totalPrice,
    productName: product.name,
    quantity: qty,
    unitPrice: unitPrice,
    balanceAfter: newBalance,
    note: `Purchase: ${product.name} (x${qty})`,
  });

  // 5.1 Reward Referrer with Purchase Commission (if user was referred & commission > 0)
  if (user.referredBy && Number(botConfig.referralPurchaseCommissionPercent || 0) > 0) {
    const pct = Number(botConfig.referralPurchaseCommissionPercent);
    const purchaseBonus = Number(((totalPrice * pct) / 100).toFixed(2));
    if (purchaseBonus > 0) {
      try {
        const refUserRef = ref(rtdb, `users/${user.referredBy}`);
        const refUserSnap = await get(refUserRef);
        if (refUserSnap.exists()) {
          const refUser = refUserSnap.val();
          const newRefBal = Number((Number(refUser.balance || 0) + purchaseBonus).toFixed(2));
          const newRefEarn = Number((Number(refUser.referralEarnings || 0) + purchaseBonus).toFixed(2));

          await update(refUserRef, {
            balance: newRefBal,
            referralEarnings: newRefEarn,
            updatedAt: new Date().toISOString(),
          });

          await recordTransaction({
            type: 'referral_purchase_bonus',
            userId: String(user.referredBy),
            userName: refUser.name || 'Referrer',
            amount: purchaseBonus,
            balanceAfter: newRefBal,
            note: `${pct}% Purchase commission from ${user.name}'s order (${formattedOrderId})`,
          });

          try {
            await ctx.api.sendMessage(
              user.referredBy,
              `💸 *Referral Purchase Commission!*\n\n` +
              `Your friend *${user.name}* just completed a purchase of *$${totalPrice.toFixed(2)}*!\n\n` +
              `🎁 *Your Bonus (${pct}%):* +$${purchaseBonus.toFixed(2)}\n` +
              `🪙 *New Wallet Balance:* $${newRefBal.toFixed(2)}`,
              { parse_mode: 'Markdown' }
            );
          } catch (notifErr) {
            console.warn(`Could not notify referrer of purchase commission:`, notifErr.message);
          }
        }
      } catch (err) {
        console.warn('Purchase referral commission error:', err.message);
      }
    }
  }

  // 6. Deliver Ultra-Slick Digital Receipt with Monospace Credentials
  const prodIcon = getButtonIcon(product.icon || product.emoji, product.name);
  const successText = `🎉 *PURCHASE SUCCESSFUL!*\n\n` +
    `🧾 *Order ID:* \`${formattedOrderId}\`\n` +
    `${prodIcon ? `${prodIcon} ` : '📦 '}*Product:* *${product.name}*\n` +
    `🔢 *Quantity:* *${qty} pcs*\n` +
    `💲 *Unit Price:* *$${unitPrice.toFixed(2)}*\n` +
    `💰 *Total Paid:* *$${totalPrice.toFixed(2)}*\n` +
    `🪙 *Remaining Balance:* *$${newBalance.toFixed(2)}*\n` +
    `📅 *Date:* *${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka', hour12: true })}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔑 *YOUR DELIVERED CREDENTIALS / CODE:*\n` +
    `\`\`\`\n${deliveredPayload}\n\`\`\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `> 🛡️ *Warranty Active:* 30-Day automated replacement warranty.\n` +
    `_Your credentials have also been saved in your Order History!_`;

  const reply_markup = createStyledKeyboard([
    [
      { text: `🔑 Receipt (${formattedOrderId})`, callback_data: `view_ord_${orderId}`, style: 'primary' },
      { text: '🧾 Order History', callback_data: 'menu_orders', style: 'primary' },
    ],
    [
      { text: '🛒 Shop More', callback_data: 'menu_shop', style: 'success' },
      { text: '📜 Transactions', callback_data: 'menu_transactions', style: 'primary' },
    ],
    [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
  ]);

  try {
    await ctx.editMessageText(successText, { parse_mode: 'Markdown', reply_markup });
  } catch {
    await ctx.reply(successText, { parse_mode: 'Markdown', reply_markup });
  }
});

// 6.1 View Single Order Receipt & Credentials
bot.callbackQuery(/^view_ord_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = ctx.match[1];
  const snap = await get(ref(rtdb, `orders/${orderId}`));

  if (!snap.exists()) {
    return ctx.reply('❌ Order record not found.', {
      reply_markup: createStyledKeyboard([
        [{ text: '🧾 Order History', callback_data: 'menu_orders', style: 'primary' }],
      ]),
    });
  }

  const ord = snap.val();
  const text = `🧾 *Official Order Invoice*\n\n` +
    `📌 *Order ID:* \`${ord.orderId || ('#' + ord.id)}\`\n` +
    `📦 *Product:* *${ord.productName}*\n` +
    `🔢 *Quantity:* *${ord.quantity || 1} pcs*\n` +
    `💰 *Amount Paid:* *$${Number(ord.totalPrice || ord.price || 0).toFixed(2)}*\n` +
    `🛡️ *Status:* ✅ *${ord.status || 'completed'}*\n` +
    `📅 *Date:* *${ord.createdAt ? new Date(ord.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Dhaka', hour12: true }) : 'N/A'}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔑 *DELIVERED CREDENTIALS:*\n` +
    `\`\`\`\n${ord.payload || 'Product credentials delivered'}\n\`\`\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `> 🛡️ 30-Day Automated Replacement Warranty Active!`;

  const reply_markup = createStyledKeyboard([
    [{ text: '◀️ Back to Orders', callback_data: 'menu_orders', style: 'primary' }],
    [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
  ]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
  } catch {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
  }
});

// 7. Wallet Menu Handler with Live Balance & Transactions Entry
bot.callbackQuery('menu_wallet', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);
  const balance = Number(user.balance || 0).toFixed(2);

  const text = formatText(botConfig.walletMessage, {
    balance: balance,
    shop_name: botConfig.shopName,
    user_id: userId,
  });

  const reply_markup = createStyledKeyboard([
    [{ text: '💰 Deposit Funds', callback_data: 'wallet_deposit', style: 'success' }],
    [{ text: '📜 Transaction History', callback_data: 'menu_transactions', style: 'primary' }],
    [{ text: '◀️ Back to Menu', callback_data: 'back_to_menu', style: 'primary' }],
  ]);

  try {
    await ctx.editMessageText(text, { reply_markup });
  } catch (err) {
    await ctx.reply(text, { reply_markup });
  }
});

// 7.1 Wallet Transactions Statement Handler
bot.callbackQuery('menu_transactions', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);
  const balance = Number(user.balance || 0).toFixed(2);

  let txList = [];
  try {
    const snap = await get(ref(rtdb, 'transactions'));
    if (snap.exists()) {
      const val = snap.val();
      for (const [key, item] of Object.entries(val)) {
        if (item.userId === String(userId)) {
          txList.push({ id: key, ...item });
        }
      }
      txList.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  } catch (e) {
    console.warn('Transactions query failed in RTDB:', e.message);
  }

  let text = `📜 *Wallet Transaction Statement*\n\n` +
    `🪙 *Current Balance:* *$${balance}*\n` +
    `📊 *Total Transactions:* *${txList.length}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (txList.length === 0) {
    text += `No transactions recorded on this account yet. Deposit funds or make a purchase to start your statement!`;
  } else {
    txList.slice(0, 8).forEach((tx) => {
      const isDeposit = tx.type === 'deposit';
      const amountVal = Math.abs(Number(tx.amount || 0)).toFixed(2);
      const dateStr = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '';

      if (isDeposit) {
        text += `🟢 *+$${amountVal}* • *Deposit* (${tx.gateway || 'Crypto'})\n` +
          `   📅 ${dateStr} | Ref: \`${tx.txId ? tx.txId.slice(0, 14) + '...' : tx.id}\`\n\n`;
      } else {
        text += `🔴 *-$${amountVal}* • *Purchase* (${tx.productName || 'Product'} x${tx.quantity || 1})\n` +
          `   📅 ${dateStr} | Order: \`${tx.orderId || tx.id}\`\n\n`;
      }
    });
  }

  const reply_markup = createStyledKeyboard([
    [
      { text: '💰 Deposit Funds', callback_data: 'wallet_deposit', style: 'success' },
      { text: '🧾 Order History', callback_data: 'menu_orders', style: 'primary' },
    ],
    [
      { text: '↩️ Back to Wallet', callback_data: 'menu_wallet', style: 'primary' },
      { text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' },
    ],
  ]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
  }
});

// 8. Dynamic Payment Gateways Deposit Handler (Image 1)
bot.callbackQuery('wallet_deposit', async (ctx) => {
  await ctx.answerCallbackQuery();
  const gateways = await getGateways();

  const text = `💸 *Add Funds to Wallet*\n\n💱 *Select your preferred payment gateway:*`;
  const rows = [];

  gateways.forEach((gw) => {
    const customEmojiId = gw.custom_emoji_id || (gw.icon && /^\d{10,}$/.test(String(gw.icon).trim()) ? String(gw.icon).trim() : null);
    const gwIcon = customEmojiId ? '' : (getButtonIcon(gw.icon || gw.id, gw.name) || '🪙');
    const btnObj = {
      text: customEmojiId ? gw.name : `${gwIcon ? `${gwIcon} ` : ''}${gw.name}`,
      callback_data: `gate_${gw.id}`,
      style: 'primary',
    };
    if (customEmojiId) {
      btnObj.icon_custom_emoji_id = String(customEmojiId);
    }
    rows.push([btnObj]);
  });

  rows.push([
    {
      text: '↩️ Back to Wallet',
      callback_data: 'menu_wallet',
      style: 'danger',
    },
  ]);

  const reply_markup = createStyledKeyboard(rows);

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
  }
});

// 8.1 Individual Payment Gateway Detail Handler (Image 2 & Image 3)
bot.callbackQuery(/^gate_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const gatewayId = ctx.match[1];
  const gw = await getGateway(gatewayId);

  if (!gw) {
    return ctx.answerCallbackQuery({ text: '❌ Payment gateway not found!', show_alert: true });
  }

  const rows = [];

  if (gw.type === 'uid') {
    // Image 3 Format: Binance Pay / Bybit Pay
    const text = `${gw.icon || '🔸'} *USDT Deposit via ${gw.name}*\n\n` +
      `💎 *Min Deposit:* ${gw.minDeposit || '0.01 USDT'}\n` +
      `💎 *Max Deposit:* ${gw.maxDeposit || '5.00 USDT'}\n\n` +
      `Please send any amount within the limit to our ${gw.name} UID:\n\n` +
      `*${gw.name} UID:*\n` +
      `\`${gw.uid || 'Contact Support'}\`\n\n` +
      `📌 *Note:* After sending, reply to this message with your ${gw.name} Order ID / TxID to verify ⚠️\n\n` +
      `_It is an 18-digit number like 450754786267348992, shown on the payment in your ${gw.name} app under Pay history._\n\n` +
      `> ⚠️ *Important:* ${gw.warning || `For more than ${gw.maxDeposit}, please use one of the other payment methods — they are credited automatically. Send only USDT via ${gw.name} to the ID above.`}`;

    rows.push([
      {
        text: `Copy ${gw.name} UID 📋`,
        callback_data: `copy_uid_${gw.id}`,
        copy_text: { text: String(gw.uid || '') },
      },
    ]);
    rows.push([
      {
        text: '✅ Submit Order ID / TxID',
        callback_data: `submit_tx_${gw.id}`,
        style: 'success',
      },
    ]);
    rows.push([
      {
        text: '❌ Cancel',
        callback_data: 'wallet_deposit',
        style: 'danger',
      },
    ]);

    const reply_markup = createStyledKeyboard(rows);
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
    } catch {
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
    }
  } else {
    // Image 2 Format: Crypto Address (BEP20, Polygon, TON, LTC, etc.)
    const text = `${gw.icon || '🔸'} *${gw.currency || 'USDT'} Deposit via ${gw.network || 'BSC (BEP20)'}*\n\n` +
      `💎 *Min Deposit:* ${gw.minDeposit || '0.01 USDT'}\n` +
      `💎 *Max Deposit:* ${gw.maxDeposit || '10000.00 USDT'}\n\n` +
      `Send any amount of ${gw.currency || 'USDT'} (${gw.network || 'BEP20'}) to your personal deposit address below:\n\n` +
      `*Your Deposit Address:*\n` +
      `\`${gw.address || 'Contact Support'}\`\n\n` +
      `✅ *Auto-detection enabled* — Your balance will be credited automatically within seconds after network confirmation ⚡\n\n` +
      `> ⚠️ *Important:* ${gw.warning || `Only send ${gw.currency || 'USDT'} on ${gw.network || 'BEP20'} network. Sending other tokens or using wrong network will result in loss of funds.`}`;

    rows.push([
      {
        text: 'Copy Address 📋',
        callback_data: `copy_addr_${gw.id}`,
        copy_text: { text: String(gw.address || '') },
      },
    ]);
    rows.push([
      {
        text: '✅ I have Paid',
        callback_data: `submit_tx_${gw.id}`,
        style: 'success',
      },
    ]);
    rows.push([
      {
        text: '◀️ Back to Deposit',
        callback_data: 'wallet_deposit',
        style: 'primary',
      },
    ]);

    const reply_markup = createStyledKeyboard(rows);
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
    } catch {
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
    }
  }
});

// 8.2 Copy Button Callback fallback
bot.callbackQuery(/^copy_(addr|uid)_(.+)$/, async (ctx) => {
  const type = ctx.match[1];
  const gatewayId = ctx.match[2];
  const gw = await getGateway(gatewayId);
  const value = type === 'uid' ? (gw?.uid || '') : (gw?.address || '');
  await ctx.answerCallbackQuery({
    text: `📋 ${value}`,
    show_alert: true,
  });
});

// 8.3 "I have Paid" / "Submit TxID" Trigger Handler
bot.callbackQuery(/^submit_tx_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const gatewayId = ctx.match[1];
  const gw = await getGateway(gatewayId);
  const userId = ctx.from.id;

  // Set user state to wait for incoming TxID text
  userSessions.set(userId, {
    awaitingTxFor: gatewayId,
    gatewayName: gw ? gw.name : 'Payment Gateway',
    timestamp: Date.now(),
  });

  const isUid = gw?.type === 'uid';
  const promptText = isUid
    ? `📝 *Submit ${gw.name} Order ID / TxID*\n\n` +
      `Gateway: *${gw.name}*\n` +
      `UID: \`${gw.uid || 'Contact Support'}\`\n\n` +
      `👇 *Please reply with your ${gw.name} 18-digit Order ID:*\n\n` +
      `_Example:_ \`450754786267348992\` or \`450754786267348992 5.00\`\n\n` +
      `⚡ *Instant Verification Active:* Your payment ID is verified automatically and credited to your wallet balance!`
    : `📝 *Submit Crypto Transaction Hash*\n\n` +
      `Gateway: *${gw?.name || 'Selected Gateway'}* (${gw?.network || 'BEP20'})\n` +
      `Address: \`${gw?.address || 'Contact Support'}\`\n\n` +
      `👇 *Please reply with your Transaction Hash (TxID):*\n\n` +
      `_Example:_ \`0x71c...3a4\`\n\n` +
      `⚡ *On-Chain Auto-Detection Active:* The bot checks the blockchain directly. Once confirmed, your balance will be credited automatically within seconds!`;

  const reply_markup = createStyledKeyboard([
    [{ text: '❌ Cancel', callback_data: `gate_${gatewayId}`, style: 'danger' }],
  ]);

  try {
    await ctx.editMessageText(promptText, { parse_mode: 'Markdown', reply_markup });
  } catch {
    await ctx.reply(promptText, { parse_mode: 'Markdown', reply_markup });
  }
});

// 8.35 Custom Emoji Helper: When user sends any Telegram Custom Emoji, detect and return its custom_emoji_id
bot.on('message', async (ctx, next) => {
  const entities = ctx.message?.entities || ctx.message?.caption_entities || [];
  const customEmojis = entities.filter((e) => e.type === 'custom_emoji');
  const userId = ctx.from?.id;

  if (customEmojis.length > 0 && (!userId || !userSessions.get(userId))) {
    const ids = customEmojis.map((e) => `• \`${e.custom_emoji_id}\``).join('\n');
    await ctx.reply(
      `✨ *Telegram Custom Emoji Detected!*\n\n` +
      `🆔 *Custom Emoji ID:*\n${ids}\n\n` +
      `💡 *How to use in Bot Buttons:*\n` +
      `Copy this ID and paste it in Admin Panel (*Telegram Custom Emoji ID*) for your product or gateway!`,
      { parse_mode: 'Markdown' }
    );
  }
  return next();
});

// 8.4 Message Text Listener: Receives Custom Quantity & TxID Submissions
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return; // Ignore slash commands

  const userId = ctx.from.id;
  const session = userSessions.get(userId);

  // 1. Handle Custom Quantity Input
  if (session && session.awaitingCustomQtyFor) {
    const prodId = session.awaitingCustomQtyFor;
    const maxStock = session.stock || 1;
    const inputQty = parseInt(text, 10);

    if (isNaN(inputQty) || inputQty <= 0) {
      return ctx.reply(`⚠️ *Invalid Quantity!* Please send a valid positive number between *1* and *${maxStock}*.`, {
        parse_mode: 'Markdown',
        reply_markup: createStyledKeyboard([
          [{ text: '❌ Cancel', callback_data: `prod_${prodId}`, style: 'danger' }],
        ]),
      });
    }

    if (inputQty > maxStock) {
      return ctx.reply(`⚠️ *Stock Shortage!* Available stock is *${maxStock} pcs*.\n\nPlease enter a quantity between *1* and *${maxStock}*:`, {
        parse_mode: 'Markdown',
        reply_markup: createStyledKeyboard([
          [{ text: `⚡ Choose Max (${maxStock})`, callback_data: `qty_${prodId}_${maxStock}`, style: 'primary' }],
          [{ text: '❌ Cancel', callback_data: `prod_${prodId}`, style: 'danger' }],
        ]),
      });
    }

    userSessions.delete(userId);
    return renderProductDetail(ctx, prodId, inputQty, false);
  }

  // 2. Handle Deposit TxID / Order ID Submission
  if (session && session.awaitingTxFor) {
    const rawInput = text;
    const parts = rawInput.split(/\s+/);
    const txId = parts[0];
    let typedAmount = parts[1] ? parseFloat(parts[1].replace(/[^0-9.]/g, '')) : null;

    const gatewayId = session.awaitingTxFor;
    const gatewayName = session.gatewayName;
    userSessions.delete(userId);

    const gw = await getGateway(gatewayId);

    // 1. Double-Spend / Duplicate Check
    const safeTxKey = txId.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const processedRef = ref(rtdb, `processed_txs/${safeTxKey}`);
    const processedSnap = await get(processedRef);

    if (processedSnap.exists()) {
      const p = processedSnap.val();
      const duplicateMsg = `❌ *Duplicate Transaction ID Detected!*\n\n` +
        `This Transaction ID / Order ID has already been credited to account \`${p.userId}\` on ${new Date(p.verifiedAt || Date.now()).toLocaleString()}.\n\n` +
        `⚠️ *Replay submissions are not permitted.* If you made a new payment, please ensure you copy the new Transaction Hash / Order ID.`;
      const reply_markup = createStyledKeyboard([
        [{ text: '◀️ Back to Deposit', callback_data: `gate_${gatewayId}`, style: 'primary' }],
        [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
      ]);
      return ctx.reply(duplicateMsg, { parse_mode: 'Markdown', reply_markup });
    }

    const depId = `dep_${Date.now()}`;
    const depositData = {
      id: depId,
      userId: String(userId),
      userName: ctx.from.first_name || ctx.from.username || 'User',
      gatewayId: gatewayId,
      gatewayName: gatewayName,
      txId: txId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // 2. Automated On-Chain Verification for EVM Crypto Hashes (BSC / Polygon)
    if (gw && gw.type === 'crypto_address' && /^0x[a-fA-F0-9]{64}$/.test(txId)) {
      const waitNotice = await ctx.reply('🔍 *Verifying transaction on blockchain network...*', { parse_mode: 'Markdown' });

      try {
        const onChainResult = await verifyOnChainTx(gw, txId);

        if (onChainResult && onChainResult.verified) {
          const creditedAmount = onChainResult.amount || 1.0;
          const userSnap = await get(ref(rtdb, `users/${userId}`));
          const currentBal = Number(userSnap.val()?.balance || 0);
          const newBal = currentBal + creditedAmount;

          // Credit balance in Firebase RTDB
          await update(ref(rtdb, `users/${userId}`), {
            balance: newBal,
            updatedAt: new Date().toISOString(),
          });

          // Mark deposit as approved
          await set(ref(rtdb, `deposits/${depId}`), {
            ...depositData,
            status: 'approved',
            amount: creditedAmount,
            creditedBalance: newBal,
            autoVerified: true,
            method: 'onchain_auto',
            chain: onChainResult.chain,
            updatedAt: new Date().toISOString(),
          });

          // Record in processed_txs to prevent future duplicate
          await set(processedRef, {
            txId: txId,
            userId: String(userId),
            amount: creditedAmount,
            gatewayId: gatewayId,
            verifiedAt: new Date().toISOString(),
            method: 'onchain_auto',
          });

          try {
            await ctx.api.deleteMessage(ctx.chat.id, waitNotice.message_id);
          } catch {}

          const successMsg = `⚡ *Payment Verified & Credited Automatically!*\n\n` +
            `💎 *Gateway:* *${gatewayName}* (${(onChainResult.chain || 'BSC').toUpperCase()})\n` +
            `💰 *Credited Amount:* *$${creditedAmount.toFixed(2)} USDT*\n` +
            `🪙 *New Wallet Balance:* *$${newBal.toFixed(2)}*\n` +
            `📌 *Tx Hash:*\n\`${txId}\`\n\n` +
            `🎉 Funds have been added to your wallet in real-time! You can now purchase products directly.`;

          const reply_markup = createStyledKeyboard([
            [{ text: '🛒 Browse Shop', callback_data: 'menu_shop', style: 'success' }],
            [{ text: '💰 View Wallet', callback_data: 'menu_wallet', style: 'primary' }],
            [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
          ]);

          return ctx.reply(successMsg, { parse_mode: 'Markdown', reply_markup });
        } else {
          // On-chain check did not confirm immediately (pending / wrong address / reverted)
          // Save as pending for manual admin review
          await set(ref(rtdb, `deposits/${depId}`), {
            ...depositData,
            note: onChainResult.reason || 'Pending on-chain confirmation',
          });

          try {
            await ctx.api.deleteMessage(ctx.chat.id, waitNotice.message_id);
          } catch {}

          const pendingMsg = `⏳ *Payment Submitted for Admin Verification*\n\n` +
            `💎 *Gateway:* *${gatewayName}*\n` +
            `📌 *Tx Hash:*\n\`${txId}\`\n\n` +
            `🔍 *Status:* ${onChainResult.reason || 'Confirming on the network.'}\n\n` +
            `✅ Your transaction details have been sent to our admin panel for live verification. Your balance will be updated within minutes!`;

          const reply_markup = createStyledKeyboard([
            [{ text: '💰 View Wallet', callback_data: 'menu_wallet', style: 'primary' }],
            [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
          ]);

          return ctx.reply(pendingMsg, { parse_mode: 'Markdown', reply_markup });
        }
      } catch (err) {
        console.error('Error during on-chain verification:', err.message);
      }
    }

    // 3. Automated Binance Pay Read-Only API Verification
    if (gw && (gw.id === 'binance-pay' || (gw.network && gw.network.toLowerCase().includes('binance')))) {
      if (gw.apiKey && gw.apiSecret) {
        const waitNotice = await ctx.reply('🔍 *Verifying payment with Binance Read-Only API...*', { parse_mode: 'Markdown' });
        try {
          const binanceResult = await verifyBinancePayment(gw.apiKey, gw.apiSecret, txId);
          try { await ctx.api.deleteMessage(ctx.chat.id, waitNotice.message_id); } catch {}

          if (binanceResult && binanceResult.verified) {
            const creditedAmount = binanceResult.amount || 1.0;
            const userSnap = await get(ref(rtdb, `users/${userId}`));
            const currentBal = Number(userSnap.val()?.balance || 0);
            const newBal = currentBal + creditedAmount;

            await update(ref(rtdb, `users/${userId}`), {
              balance: newBal,
              updatedAt: new Date().toISOString(),
            });

            await set(ref(rtdb, `deposits/${depId}`), {
              ...depositData,
              status: 'approved',
              amount: creditedAmount,
              creditedBalance: newBal,
              autoVerified: true,
              method: 'binance_api',
              payer: binanceResult.payer || '',
              updatedAt: new Date().toISOString(),
            });

            await set(processedRef, {
              txId: txId,
              userId: String(userId),
              amount: creditedAmount,
              gatewayId: gatewayId,
              verifiedAt: new Date().toISOString(),
              method: 'binance_api',
            });

            await recordTransaction({
              type: 'deposit',
              userId: String(userId),
              userName: ctx.from.first_name || ctx.from.username || 'Member',
              amount: creditedAmount,
              gateway: 'Binance Pay',
              txId: txId,
              balanceAfter: newBal,
              note: 'Deposit via Binance Pay Read-Only API',
            });

            const successMsg = `⚡ *Binance Pay Confirmed Automatically!*\n\n` +
              `💎 *Gateway:* *Binance Pay*\n` +
              `💰 *Amount Credited:* *$${creditedAmount.toFixed(2)} ${binanceResult.currency || 'USDT'}*\n` +
              `🪙 *New Wallet Balance:* *$${newBal.toFixed(2)}*\n` +
              `📌 *Order ID / TxID:*\n\`${txId}\`\n\n` +
              `🎉 Payment verified via Binance Read-Only API in real-time! Your balance is ready for shopping.`;

            const reply_markup = createStyledKeyboard([
              [{ text: '🛒 Browse Shop', callback_data: 'menu_shop', style: 'success' }],
              [{ text: '💰 View Wallet', callback_data: 'menu_wallet', style: 'primary' }],
              [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
            ]);

            return ctx.reply(successMsg, { parse_mode: 'Markdown', reply_markup });
          } else {
            await set(ref(rtdb, `deposits/${depId}`), {
              ...depositData,
              note: binanceResult.reason || 'Not matched on Binance API',
            });

            const pendingMsg = `⏳ *Payment Queued for Verification*\n\n` +
              `💎 *Gateway:* *${gatewayName}*\n` +
              `📌 *Order ID:* \`${txId}\`\n\n` +
              `🔍 *Status:* ${binanceResult.reason || 'Pending verification'}\n\n` +
              `✅ Sent to our admin panel for live 1-click confirmation. Your balance will be credited shortly!`;

            const reply_markup = createStyledKeyboard([
              [{ text: '💰 View Wallet', callback_data: 'menu_wallet', style: 'primary' }],
              [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
            ]);

            return ctx.reply(pendingMsg, { parse_mode: 'Markdown', reply_markup });
          }
        } catch (err) {
          console.error('Binance API check failed:', err.message);
        }
      }
    }

    // 4. Automated Bybit Pay Read-Only API Verification
    if (gw && (gw.id === 'bybit-pay' || (gw.network && gw.network.toLowerCase().includes('bybit')))) {
      if (gw.apiKey && gw.apiSecret) {
        const waitNotice = await ctx.reply('🔍 *Verifying transfer with Bybit Read-Only API...*', { parse_mode: 'Markdown' });
        try {
          const bybitResult = await verifyBybitPayment(gw.apiKey, gw.apiSecret, txId);
          try { await ctx.api.deleteMessage(ctx.chat.id, waitNotice.message_id); } catch {}

          if (bybitResult && bybitResult.verified) {
            const creditedAmount = bybitResult.amount || 1.0;
            const userSnap = await get(ref(rtdb, `users/${userId}`));
            const currentBal = Number(userSnap.val()?.balance || 0);
            const newBal = currentBal + creditedAmount;

            await update(ref(rtdb, `users/${userId}`), {
              balance: newBal,
              updatedAt: new Date().toISOString(),
            });

            await set(ref(rtdb, `deposits/${depId}`), {
              ...depositData,
              status: 'approved',
              amount: creditedAmount,
              creditedBalance: newBal,
              autoVerified: true,
              method: 'bybit_api',
              senderUid: bybitResult.senderUid || '',
              updatedAt: new Date().toISOString(),
            });

            await set(processedRef, {
              txId: txId,
              userId: String(userId),
              amount: creditedAmount,
              gatewayId: gatewayId,
              verifiedAt: new Date().toISOString(),
              method: 'bybit_api',
            });

            await recordTransaction({
              type: 'deposit',
              userId: String(userId),
              userName: ctx.from.first_name || ctx.from.username || 'Member',
              amount: creditedAmount,
              gateway: 'Bybit Pay',
              txId: txId,
              balanceAfter: newBal,
              note: 'Deposit via Bybit Read-Only API',
            });

            const successMsg = `⚡ *Bybit Transfer Confirmed Automatically!*\n\n` +
              `💎 *Gateway:* *Bybit Pay*\n` +
              `💰 *Amount Credited:* *$${creditedAmount.toFixed(2)} ${bybitResult.currency || 'USDT'}*\n` +
              `🪙 *New Wallet Balance:* *$${newBal.toFixed(2)}*\n` +
              `📌 *Transfer ID / TxID:*\n\`${txId}\`\n\n` +
              `🎉 Payment verified via Bybit Read-Only API in real-time! Your balance is ready for shopping.`;

            const reply_markup = createStyledKeyboard([
              [{ text: '🛒 Browse Shop', callback_data: 'menu_shop', style: 'success' }],
              [{ text: '💰 View Wallet', callback_data: 'menu_wallet', style: 'primary' }],
              [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
            ]);

            return ctx.reply(successMsg, { parse_mode: 'Markdown', reply_markup });
          } else {
            await set(ref(rtdb, `deposits/${depId}`), {
              ...depositData,
              note: bybitResult.reason || 'Not matched on Bybit API',
            });

            const pendingMsg = `⏳ *Payment Queued for Verification*\n\n` +
              `💎 *Gateway:* *${gatewayName}*\n` +
              `📌 *Transfer ID:* \`${txId}\`\n\n` +
              `🔍 *Status:* ${bybitResult.reason || 'Pending verification'}\n\n` +
              `✅ Sent to our admin panel for live 1-click confirmation. Your balance will be credited shortly!`;

            const reply_markup = createStyledKeyboard([
              [{ text: '💰 View Wallet', callback_data: 'menu_wallet', style: 'primary' }],
              [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
            ]);

            return ctx.reply(pendingMsg, { parse_mode: 'Markdown', reply_markup });
          }
        } catch (err) {
          console.error('Bybit API check failed:', err.message);
        }
      }
    }

    // 5. Fallback Instant Auto-Approve if API key is not configured but autoApprove is enabled
    if (gw && gw.type === 'uid' && gw.autoApprove && !gw.apiKey) {
      // Validate order ID / transfer ID format (16-20 digits)
      const isValidOrderId = /^\d{16,20}$/.test(txId);
      if (isValidOrderId) {
        const defaultCredit = Number(gw.autoApproveAmount) || 5.0;
        const maxLimit = parseFloat(gw.maxDeposit) || 10.0;
        const amountToCredit = Math.min(typedAmount || defaultCredit, maxLimit);

        const userSnap = await get(ref(rtdb, `users/${userId}`));
        const currentBal = Number(userSnap.val()?.balance || 0);
        const newBal = currentBal + amountToCredit;

        await update(ref(rtdb, `users/${userId}`), {
          balance: newBal,
          updatedAt: new Date().toISOString(),
        });

        await set(ref(rtdb, `deposits/${depId}`), {
          ...depositData,
          status: 'approved',
          amount: amountToCredit,
          creditedBalance: newBal,
          autoVerified: true,
          method: 'uid_auto',
          updatedAt: new Date().toISOString(),
        });

        await set(processedRef, {
          txId: txId,
          userId: String(userId),
          amount: amountToCredit,
          gatewayId: gatewayId,
          verifiedAt: new Date().toISOString(),
          method: 'uid_auto',
        });

        await recordTransaction({
          type: 'deposit',
          userId: String(userId),
          userName: ctx.from.first_name || ctx.from.username || 'Member',
          amount: amountToCredit,
          gateway: gatewayName,
          txId: txId,
          balanceAfter: newBal,
          note: `Auto-deposit via ${gatewayName}`,
        });

        const successMsg = `⚡ *${gatewayName} Payment Approved Automatically!*\n\n` +
          `💎 *Gateway:* *${gatewayName}*\n` +
          `💰 *Credited Amount:* *$${amountToCredit.toFixed(2)} USDT*\n` +
          `🪙 *New Wallet Balance:* *$${newBal.toFixed(2)}*\n` +
          `📌 *Order ID:*\n\`${txId}\`\n\n` +
          `🎉 Instant verification successful! You can now use your balance to buy any product.`;

        const reply_markup = createStyledKeyboard([
          [{ text: '🛒 Browse Shop', callback_data: 'menu_shop', style: 'success' }],
          [{ text: '💰 View Wallet', callback_data: 'menu_wallet', style: 'primary' }],
          [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
        ]);

        return ctx.reply(successMsg, { parse_mode: 'Markdown', reply_markup });
      }
    }

    // 4. Default: Save as Pending for 1-Click Admin Approval
    try {
      await set(ref(rtdb, `deposits/${depId}`), depositData);

      const confirmMsg = `🎉 *Payment Submitted for Verification!*\n\n` +
        `💎 *Gateway:* *${gatewayName}*\n` +
        `📌 *Transaction ID / Order ID:*\n\`${txId}\`\n\n` +
        `✅ Your payment details have been sent to our admin panel for live 1-click verification.\n` +
        `⚡ Your wallet balance will be credited automatically within minutes after confirmation!`;

      const reply_markup = createStyledKeyboard([
        [{ text: '💰 View Wallet', callback_data: 'menu_wallet', style: 'primary' }],
        [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
      ]);

      return ctx.reply(confirmMsg, { parse_mode: 'Markdown', reply_markup });
    } catch (err) {
      console.error('Error saving deposit to RTDB:', err.message);
      return ctx.reply('⚠️ Error saving your transaction verification. Please contact support.');
    }
  }
});

// 9. Order History Handler with Order ID and 1-Click Credential Review
bot.callbackQuery('menu_orders', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;

  let orders = [];
  try {
    const snap = await get(ref(rtdb, 'orders'));
    if (snap.exists()) {
      const val = snap.val();
      for (const [key, item] of Object.entries(val)) {
        if (item.userId === String(userId)) {
          orders.push({ id: key, ...item });
        }
      }
      orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  } catch (e) {
    console.warn('Orders query failed in RTDB:', e.message);
  }

  let text = `🧾 *Your Order History*\n\n`;
  const rows = [];

  if (orders.length === 0) {
    text += `You have not placed any orders yet. Browse our store to make your first purchase! 🛒`;
  } else {
    text += `Found *${orders.length}* total purchases. Tap any order below to view and copy credentials:\n\n`;
    orders.slice(0, 6).forEach((ord, idx) => {
      const formattedId = ord.orderId || ('#' + ord.id);
      const total = Number(ord.totalPrice || ord.price || 0).toFixed(2);
      const dateStr = ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : '';
      const ordIcon = getButtonIcon(ord.icon || ord.emoji, ord.productName);
      text += `${idx + 1}. ${ordIcon ? `${ordIcon} ` : ''}*${ord.productName}* (x${ord.quantity || 1} pcs)\n` +
        `   🧾 ID: \`${formattedId}\` | 💰 *$${total}*\n` +
        `   📅 ${dateStr} | Status: ✅ *${ord.status || 'completed'}*\n\n`;

      if (idx < 4) {
        rows.push([
          {
            text: `🔑 View ${formattedId} (${(ord.productName || 'Order').slice(0, 16)})`,
            callback_data: `view_ord_${ord.id}`,
            style: 'primary',
          },
        ]);
      }
    });
  }

  rows.push([
    { text: '🛒 Browse Shop', callback_data: 'menu_shop', style: 'success' },
    { text: '📜 Transactions', callback_data: 'menu_transactions', style: 'primary' },
  ]);
  rows.push([
    { text: '◀️ Main Menu', callback_data: 'back_to_menu', style: 'primary' },
  ]);

  const reply_markup = createStyledKeyboard(rows);

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
  }
});

// 10. Profile Handler
bot.callbackQuery('menu_profile', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);

  const text = `🛡️ *User Profile*\n\n` +
    `👤 Name: *${user.name}*\n` +
    `🆔 Telegram ID: \`${userId}\`\n` +
    `💰 Wallet Balance: *$${Number(user.balance || 0).toFixed(2)}*\n` +
    `👥 Friends Referred: *${user.referralCount || 0} users*\n` +
    `💸 Referral Bonus Earned: *$${Number(user.referralEarnings || 0).toFixed(2)}*\n` +
    `📅 Member Since: *${user.createdAt ? user.createdAt.slice(0, 10) : 'Active'}*`;

  const reply_markup = createStyledKeyboard([
    [
      { text: '💰 Wallet', callback_data: 'menu_wallet', style: 'primary' },
      { text: '💸 Refer & Earn', callback_data: 'menu_refer', style: 'success' },
    ],
    [{ text: '◀️ Back to Menu', callback_data: 'back_to_menu', style: 'primary' }],
  ]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
  }
});

// 11. Refer & Earn Handler with Instant Join Commission
bot.callbackQuery('menu_refer', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);
  const botInfo = await ctx.api.getMe();
  const refLink = `https://t.me/${botInfo.username}?start=${userId}`;

  const commission = Number(botConfig.referralCommission ?? 0.10).toFixed(2);
  const totalReferrals = Number(user.referralCount || 0);
  const totalEarnings = Number(user.referralEarnings || 0).toFixed(2);
  const shopName = botConfig.shopName || 'our store';

  const text = `💸 *Refer & Earn Program*\n\n` +
    `Invite your friends and earn real wallet balance! Whenever a new friend starts this bot through your referral link, you receive *+$${commission}* instant wallet bonus!\n\n` +
    `🔗 *Your Unique Referral Link:*\n\`${refLink}\`\n\n` +
    `📊 *Your Referral Statistics:*\n` +
    `👥 *Friends Invited:* *${totalReferrals} users*\n` +
    `💰 *Total Bonus Earned:* *$${totalEarnings}*\n` +
    `🎁 *Commission Per Join:* *$${commission}*\n\n` +
    `💡 *How to Earn:*\n` +
    `1. Tap *Share Referral Link* below or copy your link.\n` +
    `2. Share it on Telegram channels, groups, or directly with friends.\n` +
    `3. When they join, your bonus is credited instantly!`;

  const shareText = `Join ${shopName} to buy digital accounts, subscriptions, and services with instant delivery! 🎁 Use my referral link:`;
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`;

  const reply_markup = createStyledKeyboard([
    [{ text: '🚀 Share Referral Link', url: shareUrl, style: 'success' }],
    [{ text: '💰 View Wallet', callback_data: 'menu_wallet', style: 'primary' }],
    [{ text: '◀️ Back to Menu', callback_data: 'back_to_menu', style: 'primary' }],
  ]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
  }
});

// 12. About Handler
bot.callbackQuery('menu_about', async (ctx) => {
  await ctx.answerCallbackQuery();
  const text = `ℹ️ *About ${botConfig.shopName}*\n\nYour trusted one-stop marketplace for digital products, AI subscriptions, streaming services, and developer tools.\n\n⚡ Automated Instant Delivery\n🛡️ 100% Replacement Warranty\n📞 24/7 Dedicated Support`;

  const reply_markup = createStyledKeyboard([
    [{ text: '◀️ Back to Menu', callback_data: 'back_to_menu', style: 'primary' }],
  ]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
  }
});

// =======================================================
// 🌐 24/7 CRON & KEEP-ALIVE SYSTEM
// =======================================================
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS so the Admin Portal can ping and monitor the bot directly from the browser
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Record start time
const startTime = Date.now();

// 1. Root Status Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    app: 'Nurms Telegram Bot',
    shop: botConfig.shopName,
    channel: botConfig.channelId,
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    time: new Date().toISOString(),
  });
});

// 2. Dedicated Ultra-Lightweight Cron Ping Endpoint (Ideal for Cron-job.org / UptimeRobot)
app.get('/ping', async (req, res) => {
  const now = new Date().toISOString();
  console.log(`📡 [CRON PING RECEIVED] at ${now} from ${req.ip || 'external'}`);

  // Record ping event in Firebase RTDB for Admin Dashboard
  if (rtdb) {
    try {
      const pingRef = ref(rtdb, 'status/last_external_ping');
      await set(pingRef, {
        timestamp: Date.now(),
        iso: now,
        ip: req.ip || 'remote',
        source: req.headers['user-agent'] || 'cron-job',
      });
    } catch (_) {}
  }

  res.status(200).send('pong');
});

// 3. Health & Uptime Diagnostic Endpoint
app.get('/health', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  res.status(200).json({
    ok: true,
    status: 'healthy',
    uptime_seconds: uptimeSeconds,
    uptime_human: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  console.log(`🌐 24/7 Keep-alive server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = Number(PORT) + 1;
    console.warn(`⚠️ Port ${PORT} already in use. Retrying on port ${nextPort}...`);
    app.listen(nextPort, () => {
      console.log(`🌐 24/7 Keep-alive server running on fallback port ${nextPort}`);
    });
  } else {
    console.error('⚠️ Express server error:', err.message);
  }
});

// 4. Live Heartbeat to Firebase RTDB (every 30 seconds)
setInterval(async () => {
  try {
    if (rtdb) {
      const heartbeatRef = ref(rtdb, 'status/heartbeat');
      await set(heartbeatRef, {
        status: 'online',
        last_seen: new Date().toISOString(),
        timestamp: Date.now(),
        uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      });
    }
  } catch (err) {
    // silent catch to avoid unhandled rejections
  }
}, 30000);

// 5. Built-in Automated Self-Ping Cron (keeps Render 24/7 active without external cron!)
let lastSelfPingTime = 0;
setInterval(async () => {
  const urlToPing = botConfig.selfPingUrl || process.env.SELF_PING_URL;
  const enabled = botConfig.enableSelfPing !== false;
  const intervalMinutes = Number(botConfig.pingIntervalMinutes) || 10;
  const intervalMs = Math.max(intervalMinutes, 1) * 60 * 1000;

  if (enabled && urlToPing && urlToPing.startsWith('http')) {
    const now = Date.now();
    if (now - lastSelfPingTime >= intervalMs) {
      lastSelfPingTime = now;
      try {
        const pingEndpoint = urlToPing.replace(/\/$/, '') + '/ping';
        const response = await fetch(pingEndpoint);
        if (response.ok) {
          console.log(`🔄 [SELF-PING CRON SUCCESS] Pinged ${pingEndpoint} - 24/7 Active!`);
          if (rtdb) {
            const selfPingRef = ref(rtdb, 'status/last_self_ping');
            await set(selfPingRef, {
              timestamp: now,
              iso: new Date(now).toISOString(),
              target: pingEndpoint,
              status: 'success',
            });
          }
        }
      } catch (err) {
        console.warn(`⚠️ [SELF-PING ERROR]:`, err.message);
      }
    }
  }
}, 30000); // Checks every 30 seconds to respect interval adjustments dynamically

// Launch Bot
bot.start({
  onStart: (botInfo) => {
    console.log(`🚀 Nurms Bot @${botInfo.username} is successfully running with token ${token.slice(0, 10)}...`);
  },
});
