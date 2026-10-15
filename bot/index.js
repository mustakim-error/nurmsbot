require('dotenv').config();
const { Bot } = require('grammy');
const express = require('express');
const { rtdb } = require('./firebase');
const { ref, get, set, update, onValue, push } = require('firebase/database');

// Default Token embedded so Render needs zero configuration!
const token = process.env.BOT_TOKEN || '8711373245:AAGRz0PbAJ9tzac3VVr8zg_UBrIloXCT_fg';

const bot = new Bot(token);

// Default Bot Settings (Configured to user's exact channels)
let botConfig = {
  shopName: 'Nurms Shop',
  channelId: '@owloverdown',
  channelLink: 'https://t.me/owloverdown',
  botLink: '@NurmsBOT',
  supportUsername: '@owloverdown',

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
  try {
    const member = await ctx.api.getChatMember(botConfig.channelId, userId);
    const validStatuses = ['creator', 'administrator', 'member', 'restricted'];
    return validStatuses.includes(member.status);
  } catch (err) {
    console.error(`⚠️ Error checking chat member for ${userId}:`, err.message);
    return false;
  }
}

// Helper: Create Inline Keyboard with Native Telegram API 9.4+ button styles
// Supported styles: 'primary' (blue), 'success' (green), 'danger' (red)
function createStyledKeyboard(rows) {
  const inline_keyboard = rows.map((row) =>
    row.map((btn) => {
      const buttonObj = { text: btn.text };
      if (btn.url) buttonObj.url = btn.url;
      if (btn.callback_data) buttonObj.callback_data = btn.callback_data;
      if (btn.style) buttonObj.style = btn.style;
      return buttonObj;
    })
  );
  return { inline_keyboard };
}

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
          style: 'success', // Green button in Telegram
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
      { text: botConfig.btnReferText, callback_data: 'menu_refer', style: botConfig.btnReferStyle || 'success' }, // Green button
      { text: botConfig.btnProfileText, callback_data: 'menu_profile', style: botConfig.btnProfileStyle || 'primary' },
    ],
    [
      {
        text: botConfig.btnSupportText,
        url: `https://t.me/${botConfig.supportUsername.replace('@', '')}`,
        style: botConfig.btnSupportStyle || 'success', // Green button
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

  // Generate Product Buttons with dynamic Colors based on Stock:
  // Stock > 0: 'success' (GREEN button)
  // Stock <= 0: 'danger' (RED button)
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

  // Fixed Back to Menu button (Blue 'primary')
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

// 8. Deposit Information Handler
bot.callbackQuery('wallet_deposit', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;

  const text = `💳 *Deposit Instructions*\n\nTo add balance to your wallet, send payment using any of the methods below:\n\n📱 *bKash (Personal/Send Money):*\n\`${botConfig.bkashNumber || 'Contact Support'}\`\n\n⚡ *Nagad (Personal):*\n\`${botConfig.nagadNumber || 'Contact Support'}\`\n\n💎 *Binance Pay / USDT (TRC20):*\n\`${botConfig.binancePayId || 'Contact Support'}\`\n\n━━━━━━━━━━━━━━━━━━━━\n📌 *After payment, send your Telegram ID:*\n\`${userId}\` along with your payment screenshot/TrxID to our official support agent:\n👉 [${botConfig.supportUsername}](https://t.me/${botConfig.supportUsername.replace('@', '')})\n\n⚡ Your balance will be credited to your wallet within 2-5 minutes!`;

  const reply_markup = createStyledKeyboard([
    [
      {
        text: '📞 Contact Support to Deposit',
        url: `https://t.me/${botConfig.supportUsername.replace('@', '')}`,
        style: 'success',
      },
    ],
    [
      { text: '◀️ Back to Wallet', callback_data: 'menu_wallet', style: 'primary' },
      { text: '🏠 Main Menu', callback_data: 'back_to_menu', style: 'primary' },
    ],
  ]);

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup });
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

// 13. Health Check HTTP Server (Essential for Render 24/7 Web Service)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    app: 'Nurms Telegram Bot',
    shop: botConfig.shopName,
    channel: botConfig.channelId,
    time: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Keep-alive server running on port ${PORT}`);
});

// Launch Bot
bot.start({
  onStart: (botInfo) => {
    console.log(`🚀 Nurms Bot @${botInfo.username} is successfully running with token ${token.slice(0, 10)}...`);
  },
});
