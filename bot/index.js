require('dotenv').config();
const { Bot } = require('grammy');
const express = require('express');
const { rtdb } = require('./firebase');
const { ref, get, set, update, onValue } = require('firebase/database');

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

// Helper: Get or Create User in Firebase RTDB
async function getUser(userId, userInfo = {}) {
  const userRef = ref(rtdb, `users/${userId}`);
  const snap = await get(userRef);

  if (!snap.exists()) {
    const newUser = {
      telegram_id: String(userId),
      name: userInfo.first_name || 'User',
      username: userInfo.username || '',
      balance: 0.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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

// Helper: Create Inline Keyboard with Native Telegram API button styles & copy_text
function createStyledKeyboard(rows) {
  const inline_keyboard = rows.map((row) =>
    row.map((btn) => {
      const buttonObj = { text: btn.text };
      if (btn.url) buttonObj.url = btn.url;
      if (btn.callback_data) buttonObj.callback_data = btn.callback_data;
      if (btn.copy_text) buttonObj.copy_text = btn.copy_text;
      if (btn.style) buttonObj.style = btn.style;
      return buttonObj;
    })
  );
  return { inline_keyboard };
}

// Default Presets for Payment Gateways
const DEFAULT_GATEWAYS = [
  {
    id: 'usdt-bep20',
    name: 'USDT (BEP20)',
    icon: '🔸',
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
    icon: '🟣',
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
    icon: '💎',
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
    icon: '💎',
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
    icon: '🔸',
    type: 'uid',
    currency: 'USDT',
    network: 'Binance Pay',
    minDeposit: '0.01 USDT',
    maxDeposit: '5.00 USDT',
    uid: '1233668018',
    warning: 'For more than 5.00 USDT, please use one of the other payment methods — they are credited automatically. Send only USDT via Binance Pay to the ID above.',
    active: true,
  },
  {
    id: 'bybit-pay',
    name: 'Bybit Pay',
    icon: '🟡',
    type: 'uid',
    currency: 'USDT',
    network: 'Bybit UID',
    minDeposit: '0.01 USDT',
    maxDeposit: '100.00 USDT',
    uid: '987654321',
    warning: 'Send USDT via Bybit internal transfer to the UID above and submit your Transaction ID.',
    active: true,
  },
  {
    id: 'ltc',
    name: 'LTC (Litecoin)',
    icon: 'Ł',
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

  // Ensure user exists in Firebase
  const user = await getUser(userId, ctx.from);

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
    const icon = prod.icon || '';
    const label = `${icon ? `${icon} ` : ''}${prod.name} - ${priceDisplay}`;

    rows.push([
      {
        text: label,
        callback_data: `prod_${prod.id}`,
        style: isAvailable ? 'success' : 'danger',
      },
    ]);
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

// 5. Product Detail & Purchase Preview
bot.callbackQuery(/^prod_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const prodId = ctx.match[1];

  let product = null;
  const snap = await get(ref(rtdb, `products/${prodId}`));
  if (snap.exists()) {
    product = { id: prodId, ...snap.val() };
  }

  if (!product) {
    product = {
      id: prodId,
      name: prodId.replace('-', ' ').toUpperCase(),
      price: 0,
      stock: 10,
      description: 'Instant automated delivery. 30 Days Replacement Warranty.',
    };
  }

  const inStock = Number(product.stock) > 0;
  const text = `📦 Product: *${product.name}*\n\n💰 Price: *$${product.price}*\n📊 Stock: *${inStock ? `${product.stock} available` : 'Out of Stock'}*\n\n📝 Description:\n${product.description || 'Premium digital product with full warranty.'}\n\nClick below to confirm your purchase:`;

  const rows = [];
  if (inStock) {
    rows.push([
      { text: '⚡ Buy Now', callback_data: `buy_${product.id}`, style: 'success' },
    ]);
  }
  rows.push([
    { text: '◀️ Back to Shop', callback_data: 'menu_shop', style: 'primary' },
    { text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' },
  ]);

  const reply_markup = createStyledKeyboard(rows);

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
  }
});

// 6. Buy Product Execution
bot.callbackQuery(/^buy_(.+)$/, async (ctx) => {
  const prodId = ctx.match[1];
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);

  let product = null;
  const prodSnap = await get(ref(rtdb, `products/${prodId}`));
  if (prodSnap.exists()) {
    product = { id: prodId, ...prodSnap.val() };
  }

  if (!product) {
    return ctx.answerCallbackQuery({ text: '❌ Product not found or unavailable!', show_alert: true });
  }

  if (Number(product.stock) <= 0) {
    return ctx.answerCallbackQuery({ text: '⚠️ Sorry, this item is out of stock!', show_alert: true });
  }

  const price = Number(product.price || 0);
  const currentBalance = Number(user.balance || 0);

  if (currentBalance < price) {
    await ctx.answerCallbackQuery({
      text: `❌ Insufficient Balance! Price is $${price.toFixed(2)}, your balance is $${currentBalance.toFixed(2)}.`,
      show_alert: true,
    });

    const text = `❌ *Insufficient Balance*\n\nYou need *$${price.toFixed(2)}* to purchase *${product.name}*.\nYour current balance: *$${currentBalance.toFixed(2)}*.\n\nPlease deposit balance to proceed!`;
    const reply_markup = createStyledKeyboard([
      [{ text: '💰 Deposit', callback_data: 'wallet_deposit', style: 'success' }],
      [{ text: '◀️ Back to Shop', callback_data: 'menu_shop', style: 'primary' }],
    ]);

    return ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
  }

  // Deduct balance & create order in RTDB
  const newBalance = currentBalance - price;

  await update(ref(rtdb, `users/${userId}`), { balance: newBalance });
  await update(ref(rtdb, `products/${prodId}`), {
    stock: Math.max(0, (product.stock || 1) - 1),
  });

  const orderId = `order_${Date.now()}`;
  await set(ref(rtdb, `orders/${orderId}`), {
    id: orderId,
    userId: String(userId),
    userName: user.name,
    productId: product.id,
    productName: product.name,
    price: price,
    payload: product.payload || 'Product credentials delivered successfully.',
    status: 'completed',
    createdAt: new Date().toISOString(),
  });

  await ctx.answerCallbackQuery({ text: '🎉 Purchase successful!' });

  const successText = `🎉 *Purchase Successful!*\n\nProduct: *${product.name}*\nDeducted: *$${price.toFixed(2)}*\nRemaining Balance: *$${newBalance.toFixed(2)}*\n\n🔑 *Your Product Credentials / Activation:*\n\`${product.payload || 'Account credentials sent to your inbox. Contact support if needed!'}\`\n\nThank you for choosing ${botConfig.shopName}!`;

  const reply_markup = createStyledKeyboard([
    [
      { text: '🧾 Order History', callback_data: 'menu_orders', style: 'primary' },
      { text: '🛒 Shop More', callback_data: 'menu_shop', style: 'success' },
    ],
    [{ text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' }],
  ]);

  await ctx.editMessageText(successText, { parse_mode: 'Markdown', reply_markup });
});

// 7. Wallet Menu Handler (Image 4)
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
    [{ text: '💰 Deposit', callback_data: 'wallet_deposit', style: 'success' }],
    [{ text: '◀️ Back to Menu', callback_data: 'back_to_menu', style: 'primary' }],
  ]);

  try {
    await ctx.editMessageText(text, { reply_markup });
  } catch (err) {
    await ctx.reply(text, { reply_markup });
  }
});

// 8. Dynamic Payment Gateways Deposit Handler (Image 1)
bot.callbackQuery('wallet_deposit', async (ctx) => {
  await ctx.answerCallbackQuery();
  const gateways = await getGateways();

  const text = `💸 *Add Funds to Wallet*\n\n💱 *Select your preferred payment gateway:*`;
  const rows = [];

  gateways.forEach((gw) => {
    rows.push([
      {
        text: `${gw.icon || '🪙'} ${gw.name}`,
        callback_data: `gate_${gw.id}`,
        style: 'primary',
      },
    ]);
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

  const promptText = `📝 *Submit Payment Verification*\n\n` +
    `Gateway: *${gw?.name || 'Selected Gateway'}*\n\n` +
    `👇 *Please reply to this chat with your Transaction Hash (TxID) or Binance Order ID:*\n\n` +
    `_Example:_ \`450754786267348992\` or \`0x71c...3a4\`\n\n` +
    `Once you send the ID, it will be automatically sent to the admin team for verification!`;

  const reply_markup = createStyledKeyboard([
    [{ text: '❌ Cancel', callback_data: `gate_${gatewayId}`, style: 'danger' }],
  ]);

  try {
    await ctx.editMessageText(promptText, { parse_mode: 'Markdown', reply_markup });
  } catch {
    await ctx.reply(promptText, { parse_mode: 'Markdown', reply_markup });
  }
});

// 8.4 Message Text Listener: Receives TxID and Saves Deposit Request to Firebase
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  if (text.startsWith('/')) return; // Ignore slash commands

  const userId = ctx.from.id;
  const session = userSessions.get(userId);

  if (session && session.awaitingTxFor) {
    const txId = text;
    const gatewayId = session.awaitingTxFor;
    const gatewayName = session.gatewayName;
    userSessions.delete(userId);

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

    try {
      await set(ref(rtdb, `deposits/${depId}`), depositData);

      const confirmMsg = `🎉 *Payment Submitted for Verification!*\n\n` +
        `💎 *Gateway:* *${gatewayName}*\n` +
        `📌 *Transaction ID / Order ID:*\n\`${txId}\`\n\n` +
        `✅ Your payment details have been sent to our admin panel for live verification.\n` +
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

// 9. Order History Handler
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
          orders.push(item);
        }
      }
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  } catch (e) {
    console.warn('Orders query failed in RTDB:', e.message);
  }

  let text = `🧾 *Your Recent Orders*\n\n`;
  if (orders.length === 0) {
    text += `You have not made any purchases yet. Browse our shop to get started!`;
  } else {
    orders.slice(0, 10).forEach((ord, idx) => {
      text += `${idx + 1}. *${ord.productName}* - $${Number(ord.price).toFixed(2)}\n📅 ${ord.createdAt ? ord.createdAt.slice(0, 10) : ''} | Status: ${ord.status}\n\n`;
    });
  }

  const reply_markup = createStyledKeyboard([
    [{ text: '🛒 Browse Shop', callback_data: 'menu_shop', style: 'success' }],
    [{ text: '◀️ Back to Menu', callback_data: 'back_to_menu', style: 'primary' }],
  ]);

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

  const text = `🛡️ *User Profile*\n\n👤 Name: *${user.name}*\n🆔 Telegram ID: \`${userId}\`\n💰 Balance: *$${Number(user.balance || 0).toFixed(2)}*\n📅 Member Since: *${user.createdAt ? user.createdAt.slice(0, 10) : 'Active'}*`;

  const reply_markup = createStyledKeyboard([
    [{ text: '💰 Wallet', callback_data: 'menu_wallet', style: 'primary' }],
    [{ text: '◀️ Back to Menu', callback_data: 'back_to_menu', style: 'primary' }],
  ]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
  }
});

// 11. Refer & Earn Handler
bot.callbackQuery('menu_refer', async (ctx) => {
  await ctx.answerCallbackQuery();
  const botInfo = await ctx.api.getMe();
  const refLink = `https://t.me/${botInfo.username}?start=${ctx.from.id}`;

  const text = `💸 *Refer & Earn Program*\n\nShare your referral link with friends and earn bonus wallet balance on every purchase they make!\n\n🔗 *Your Referral Link:*\n\`${refLink}\``;

  const reply_markup = createStyledKeyboard([
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
