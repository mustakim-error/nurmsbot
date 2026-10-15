require('dotenv').config();
const { Bot, InlineKeyboard } = require('grammy');
const express = require('express');
const { db } = require('./firebase');

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ Error: BOT_TOKEN is missing in environment variables.');
  process.exit(1);
}

const bot = new Bot(token);

// Default Fallback Settings
let botConfig = {
  channelId: process.env.CHANNEL_ID || '@WarzoneShop',
  channelLink: process.env.CHANNEL_LINK || 'https://t.me/WarzoneShop',
  shopName: process.env.SHOP_NAME || 'Warzone Shop',
  supportUsername: process.env.SUPPORT_USERNAME || '@mustakim_support',
  bkashNumber: '01XXXXXXXXX',
  nagadNumber: '01XXXXXXXXX',
  binancePayId: '12345678',
};

// Sync settings dynamically from Firebase Firestore in real-time
if (db) {
  try {
    db.collection('settings')
      .doc('bot_config')
      .onSnapshot((doc) => {
        if (doc && doc.exists) {
          const data = doc.data();
          botConfig = {
            channelId: data.channelId || botConfig.channelId,
            channelLink: data.channelLink || botConfig.channelLink,
            shopName: data.shopName || botConfig.shopName,
            supportUsername: data.supportUsername || botConfig.supportUsername,
            bkashNumber: data.bkashNumber || botConfig.bkashNumber,
            nagadNumber: data.nagadNumber || botConfig.nagadNumber,
            binancePayId: data.binancePayId || botConfig.binancePayId,
          };
          console.log('🔄 Realtime Bot Config Synced from Firebase:', botConfig);
        }
      });
  } catch (err) {
    console.error('⚠️ Could not listen to settings collection:', err.message);
  }
}

// Helper: Get or Create User in Firebase
async function getUser(userId, userInfo = {}) {
  if (!db) {
    return {
      telegram_id: userId,
      name: userInfo.first_name || 'User',
      username: userInfo.username || '',
      balance: 0.0,
    };
  }

  const userRef = db.collection('users').doc(String(userId));
  const doc = await userRef.get();

  if (!doc.exists) {
    const newUser = {
      telegram_id: String(userId),
      name: userInfo.first_name || 'User',
      username: userInfo.username || '',
      balance: 0.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await userRef.set(newUser);
    return newUser;
  }

  const existingUser = doc.data();
  // Keep name and username updated
  if (userInfo.first_name && existingUser.name !== userInfo.first_name) {
    await userRef.update({
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
    // If bot is not admin in the channel yet, return false with a log
    return false;
  }
}

// Helper: Main Menu Keyboard & Text Generator
function getMainMenu(user) {
  const name = user.name || 'User';
  const balance = Number(user.balance || 0).toFixed(2);
  const text = `Welcome to ${botConfig.shopName} 🎉\n👋 Hello! ${name}\n\n📌 Account Details\n💳 Telegram ID: ${user.telegram_id}\n💰 Balance: $${balance}\n\nChoose below 🔹`;

  const keyboard = new InlineKeyboard()
    .text('🛒 Shop', 'menu_shop')
    .text('💰 Wallet', 'menu_wallet')
    .row()
    .text('🧾 Order History', 'menu_orders')
    .text('📦 My Orders', 'menu_orders')
    .row()
    .text('💸 Refer & Earn', 'menu_refer')
    .text('🛡️ Profile', 'menu_profile')
    .row()
    .url('🗣️ Support', `https://t.me/${botConfig.supportUsername.replace('@', '')}`)
    .text('ℹ️ About', 'menu_about');

  return { text, keyboard };
}

// 1. /start Command Handler
bot.command('start', async (ctx) => {
  const userId = ctx.from.id;
  const firstName = ctx.from.first_name || 'Member';

  // Always ensure user document exists in Firebase
  const user = await getUser(userId, ctx.from);

  // Check channel subscription
  const joined = await isChannelMember(ctx, userId);

  if (!joined) {
    // Show Join Verification Screen (Matching Image 1)
    const text = `👋 Hey! ${firstName} Please Join our Official channel to access this bot ❗`;
    const keyboard = new InlineKeyboard()
      .url(`▶️ ${botConfig.shopName}`, botConfig.channelLink)
      .row()
      .text('✨ I Have Joined', 'verify_joined');

    return ctx.reply(text, { reply_markup: keyboard });
  }

  // If joined, show Main Menu (Matching Image 2)
  const menu = getMainMenu(user);
  return ctx.reply(menu.text, { reply_markup: menu.keyboard });
});

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
  const menu = getMainMenu(user);

  try {
    await ctx.editMessageText(menu.text, { reply_markup: menu.keyboard });
  } catch (e) {
    await ctx.reply(menu.text, { reply_markup: menu.keyboard });
  }
});

// 3. Back to Main Menu Handler
bot.callbackQuery('back_to_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);
  const menu = getMainMenu(user);

  try {
    await ctx.editMessageText(menu.text, { reply_markup: menu.keyboard });
  } catch (e) {
    await ctx.reply(menu.text, { reply_markup: menu.keyboard });
  }
});

// 4. Shop Menu Handler (Matching Image 3)
bot.callbackQuery('menu_shop', async (ctx) => {
  await ctx.answerCallbackQuery();

  let products = [];
  if (db) {
    try {
      const snapshot = await db.collection('products').where('active', '==', true).get();
      snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.error('Error fetching products:', err.message);
    }
  }

  // Fallback demo products if database has no items yet
  if (products.length === 0) {
    products = [
      { id: 'chatgpt-plus', name: 'ChatGPT Plus 1m', price: 0, stock: 5 },
      { id: 'cursor-pro', name: 'Cursor Pro 1m + Grok Bot 1m', price: 0, stock: 3 },
      { id: 'gemini-pro', name: 'Gemini AI PRO 18m 2nd Service', price: 0, stock: 4 },
      { id: 'gemini-7d', name: 'Gemini New 7 Days Expiry Links', price: 25, stock: 10 },
      { id: 'adobe-express', name: 'Adobe Express 12M', price: 72, stock: 8 },
      { id: 'duolingo-super', name: 'Duolingo Super 12M', price: 156, stock: 6 },
      { id: 'apple-music', name: 'Apple Music 5M', price: 208, stock: 12 },
    ];
  }

  const text = `🛒 Available Products\n⬇️ Choose an option to buy:`;
  const keyboard = new InlineKeyboard();

  products.forEach((prod) => {
    const priceDisplay = Number(prod.price) === 0 ? '0' : `$${prod.price}`;
    keyboard.text(`${prod.name} - ${priceDisplay}`, `prod_${prod.id}`).row();
  });

  // Fixed Back to Menu button
  keyboard.text('◀️ Back to Menu', 'back_to_menu');

  try {
    await ctx.editMessageText(text, { reply_markup: keyboard });
  } catch (err) {
    await ctx.reply(text, { reply_markup: keyboard });
  }
});

// 5. Product Detail & Purchase Preview
bot.callbackQuery(/^prod_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const prodId = ctx.match[1];

  let product = null;
  if (db) {
    const doc = await db.collection('products').doc(prodId).get();
    if (doc.exists) {
      product = { id: doc.id, ...doc.data() };
    }
  }

  // Fallback if demo
  if (!product) {
    product = {
      id: prodId,
      name: prodId.replace('-', ' ').toUpperCase(),
      price: 0,
      stock: 10,
      description: 'Instant automated delivery. 30 Days Replacement Warranty.',
    };
  }

  const text = `📦 Product: *${product.name}*\n\n💰 Price: *$${product.price}*\n📊 Stock: *${product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}*\n\n📝 Description:\n${product.description || 'Premium digital product with full warranty.'}\n\nClick below to confirm your purchase:`;

  const keyboard = new InlineKeyboard();
  if (product.stock > 0) {
    keyboard.text('⚡ Buy Now', `buy_${product.id}`).row();
  }
  keyboard.text('◀️ Back to Shop', 'menu_shop').text('🏠 Main Menu', 'back_to_menu');

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
});

// 6. Buy Product Execution
bot.callbackQuery(/^buy_(.+)$/, async (ctx) => {
  const prodId = ctx.match[1];
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);

  let product = null;
  let prodRef = null;

  if (db) {
    prodRef = db.collection('products').doc(prodId);
    const doc = await prodRef.get();
    if (doc.exists) {
      product = { id: doc.id, ...doc.data() };
    }
  }

  if (!product) {
    return ctx.answerCallbackQuery({ text: '❌ Product not found or unavailable!', show_alert: true });
  }

  if (product.stock <= 0) {
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
    const keyboard = new InlineKeyboard()
      .text('💰 Deposit', 'wallet_deposit')
      .row()
      .text('◀️ Back to Shop', 'menu_shop');

    return ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  }

  // Deduct balance and create order
  const newBalance = currentBalance - price;

  if (db) {
    const userRef = db.collection('users').doc(String(userId));
    await userRef.update({ balance: newBalance });

    // Decrement stock
    await prodRef.update({
      stock: (product.stock || 1) - 1,
    });

    // Create order document
    await db.collection('orders').add({
      userId: String(userId),
      userName: user.name,
      productId: product.id,
      productName: product.name,
      price: price,
      payload: product.payload || 'Product delivered successfully via digital credentials.',
      status: 'completed',
      createdAt: new Date().toISOString(),
    });
  }

  await ctx.answerCallbackQuery({ text: '🎉 Purchase successful!' });

  const successText = `🎉 *Purchase Successful!*\n\nProduct: *${product.name}*\nDeducted: *$${price.toFixed(2)}*\nRemaining Balance: *$${newBalance.toFixed(2)}*\n\n🔑 *Your Product Credentials / Activation:*\n\`${product.payload || 'Account credentials sent to your inbox. Contact support if needed!'}\`\n\nThank you for choosing ${botConfig.shopName}!`;

  const keyboard = new InlineKeyboard()
    .text('🧾 Order History', 'menu_orders')
    .text('🛒 Shop More', 'menu_shop')
    .row()
    .text('🏠 Main Menu', 'back_to_menu');

  await ctx.editMessageText(successText, { parse_mode: 'Markdown', reply_markup: keyboard });
});

// 7. Wallet Menu Handler (Matching Image 4)
bot.callbackQuery('menu_wallet', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);
  const balance = Number(user.balance || 0).toFixed(2);

  const text = `💲 Wallet\n\n🪙 Current Balance: $${balance}\n\n"You can add balance to your wallet and use it to purchase products directly!"`;

  const keyboard = new InlineKeyboard()
    .text('💰 Deposit', 'wallet_deposit')
    .row()
    .text('◀️ Back to Menu', 'back_to_menu');

  try {
    await ctx.editMessageText(text, { reply_markup: keyboard });
  } catch (err) {
    await ctx.reply(text, { reply_markup: keyboard });
  }
});

// 8. Deposit Information Handler
bot.callbackQuery('wallet_deposit', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;

  const text = `💳 *Deposit Instructions*\n\nTo add balance to your wallet, send payment using any of the methods below:\n\n📱 *bKash (Personal/Send Money):*\n\`${botConfig.bkashNumber || 'Contact Support'}\`\n\n⚡ *Nagad (Personal):*\n\`${botConfig.nagadNumber || 'Contact Support'}\`\n\n💎 *Binance Pay / USDT (TRC20):*\n\`${botConfig.binancePayId || 'Contact Support'}\`\n\n━━━━━━━━━━━━━━━━━━━━\n📌 *After payment, send your Telegram ID:*\n\`${userId}\` along with your payment screenshot/TrxID to our official support agent:\n👉 [${botConfig.supportUsername}](https://t.me/${botConfig.supportUsername.replace('@', '')})\n\n⚡ Your balance will be credited to your wallet within 2-5 minutes!`;

  const keyboard = new InlineKeyboard()
    .url('📞 Contact Support to Deposit', `https://t.me/${botConfig.supportUsername.replace('@', '')}`)
    .row()
    .text('◀️ Back to Wallet', 'menu_wallet')
    .text('🏠 Main Menu', 'back_to_menu');

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
});

// 9. Order History Handler
bot.callbackQuery('menu_orders', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;

  let orders = [];
  if (db) {
    try {
      const snap = await db
        .collection('orders')
        .where('userId', '==', String(userId))
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      snap.forEach((d) => orders.push(d.data()));
    } catch (e) {
      console.warn('Orders query failed (needs index or fallback):', e.message);
    }
  }

  let text = `🧾 *Your Recent Orders*\n\n`;
  if (orders.length === 0) {
    text += `You have not made any purchases yet. Browse our shop to get started!`;
  } else {
    orders.forEach((ord, idx) => {
      text += `${idx + 1}. *${ord.productName}* - $${Number(ord.price).toFixed(2)}\n📅 ${ord.createdAt.slice(0, 10)} | Status: ${ord.status}\n\n`;
    });
  }

  const keyboard = new InlineKeyboard()
    .text('🛒 Browse Shop', 'menu_shop')
    .row()
    .text('◀️ Back to Menu', 'back_to_menu');

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
});

// 10. Profile Handler
bot.callbackQuery('menu_profile', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const user = await getUser(userId, ctx.from);

  const text = `🛡️ *User Profile*\n\n👤 Name: *${user.name}*\n🆔 Telegram ID: \`${userId}\`\n💰 Balance: *$${Number(user.balance || 0).toFixed(2)}*\n📅 Member Since: *${user.createdAt ? user.createdAt.slice(0, 10) : 'Active'}*`;

  const keyboard = new InlineKeyboard()
    .text('💰 Wallet', 'menu_wallet')
    .text('◀️ Back to Menu', 'back_to_menu');

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
});

// 11. Refer & Earn Handler
bot.callbackQuery('menu_refer', async (ctx) => {
  await ctx.answerCallbackQuery();
  const botInfo = await ctx.api.getMe();
  const refLink = `https://t.me/${botInfo.username}?start=${ctx.from.id}`;

  const text = `💸 *Refer & Earn Program*\n\nShare your referral link with friends and earn bonus wallet balance on every purchase they make!\n\n🔗 *Your Referral Link:*\n\`${refLink}\``;

  const keyboard = new InlineKeyboard()
    .text('◀️ Back to Menu', 'back_to_menu');

  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
});

// 12. About Handler
bot.callbackQuery('menu_about', async (ctx) => {
  await ctx.answerCallbackQuery();
  const text = `ℹ️ *About ${botConfig.shopName}*\n\nYour trusted one-stop marketplace for digital products, AI subscriptions, streaming services, and developer tools.\n\n⚡ Automated Instant Delivery\n🛡️ 100% Replacement Warranty\n📞 24/7 Dedicated Support`;

  const keyboard = new InlineKeyboard().text('◀️ Back to Menu', 'back_to_menu');
  try {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (e) {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
});

// 13. Health Check HTTP Server (Essential for Render 24/7 Web Service)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    app: 'DIGIX Telegram Bot',
    shop: botConfig.shopName,
    time: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Keep-alive server running on port ${PORT}`);
});

// Launch Bot
bot.start({
  onStart: (botInfo) => {
    console.log(`🚀 DIGIX Bot @${botInfo.username} is successfully running!`);
  },
});
