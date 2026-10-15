# 💎 NURMS - Telegram Digital Store & Realtime Firebase CMS

**NURMS** (5-letter brand name: **N-U-R-M-S**) is a complete, production-ready Telegram Digital Product Selling Bot and Admin Portal ecosystem.

## 🏗️ Project Architecture

```
nurms/
├── bot/                     # Telegram Bot Engine (Hosted on Render)
│   ├── index.js             # grammY Telegram Bot with force-sub & realtime shop
│   ├── firebase.js          # Firebase Client/Admin SDK connector
│   ├── package.json
│   ├── .env.example
│   └── README.md            # Render deployment instructions
│
└── admin/                   # Admin Portal (Hosted on Vercel)
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx     # Dashboard & live statistics
    │   │   ├── products/    # Add, edit, delete digital items & prices
    │   │   ├── users/       # Manage Telegram users & top up wallet balances
    │   │   ├── orders/      # Live purchases & delivery log
    │   │   └── settings/    # Change channel link & bot configs live
    │   ├── components/ui/   # Pure Shadcn UI components
    │   └── lib/firebase.ts  # Firebase Client SDK
    ├── package.json
    ├── .env.example
    └── README.md            # Vercel deployment instructions
```

---

## 📸 Implemented Screens & Telegram Flow

1. **Screen 1 (`/start` with Force Subscription)**:
   - When a user sends `/start`, the bot checks if they are a member of your official Telegram channel.
   - If not joined, it displays:
     ```
     👋 Hey! {Name} Please Join our Official channel to access this bot ❗
     [ ▶️ Warzone Shop (Channel URL) ]
     [ ✨ I Have Joined ]
     ```
   - Clicking `✨ I Have Joined` uses Telegram API `getChatMember` to verify membership. If not joined, it alerts the user. If joined, it transitions seamlessly to Screen 2.

2. **Screen 2 (Main Menu)**:
   - Displays:
     ```
     Welcome to Warzone Shop 🎉
     👋 Hello! {Name}

     📌 Account Details
     💳 Telegram ID: {ID}
     💰 Balance: ${Balance}

     Choose below 🔹
     ```
   - 8 Action buttons:
     - `🛒 Shop` | `💰 Wallet`
     - `🧾 Order History` | `📦 My Orders`
     - `💸 Refer & Earn` | `🛡️ Profile`
     - `🗣️ Support` | `ℹ️ About`

3. **Screen 3 (Shop Menu - Dynamic from Firebase)**:
   - Fetches active items live from Firestore `products` collection.
   - Shows buttons like:
     - `ChatGPT Plus 1m - $0`
     - `Cursor Pro 1m + Grok Bot 1m - $0`
     - `Gemini AI PRO 18m 2nd Service - $0`
     - `Gemini New 7 Days Expiry Links - $25`
     - `Adobe Express 12M - $72`
     - `Duolingo Super 12M - $156`
     - `Apple Music 5M - $208`
   - Bottom button: `◀️ Back to Menu`
   - Clicking an item shows full details + **⚡ Buy Now** button.
   - Checks balance, deducts money, and delivers digital credentials automatically.

4. **Screen 4 (Wallet Menu)**:
   - Displays current balance and instructions to deposit.
   - Buttons: `💰 Deposit` (provides bKash/Nagad/Binance contact info) and `◀️ Back to Menu`.

---

## 🔥 Firebase Database Structure

- `settings/bot_config`:
  - `channelId`: `@YourOfficialChannel`
  - `channelLink`: `https://t.me/YourOfficialChannel`
  - `shopName`: `Warzone Shop`
  - `supportUsername`: `@YourSupportHandle`
- `products/{productId}`:
  - `name`, `price`, `stock`, `description`, `payload`, `active`
- `users/{telegramId}`:
  - `telegram_id`, `name`, `username`, `balance`, `createdAt`
- `orders/{orderId}`:
  - `userId`, `userName`, `productId`, `productName`, `price`, `payload`, `status`, `createdAt`

## ⏰ 24/7 Bot Uptime & Cron System (Render Keep-Alive)

Render free tier puts web services to sleep after 15 minutes of inactivity. To keep `@NurmsBOT` active 24/7/365 without paying for hosting, the bot includes a built-in keep-alive architecture:

### 1. Built-in Endpoints
- **`GET /ping`**: Ultra-fast lightweight response (`pong`), records incoming pings in Firebase RTDB (`status/last_external_ping`).
- **`GET /health`**: Returns system uptime, process memory, and health status JSON.
- **Heartbeat Daemon**: Updates `status/heartbeat` in Firebase RTDB every 30 seconds.

### 2. Method A: Built-in Automated Self-Ping
- Simply go to the Admin Panel &rarr; **24/7 Uptime & Cron** (or **Bot Settings** &rarr; Tab 5).
- Enter your Render Web Service URL (e.g. `https://nurmsbot.onrender.com`).
- Enable **Self-Ping Loop** (interval: 5-10 minutes).
- The bot process automatically pings its own `/ping` endpoint and stays awake!

### 3. Method B: External Free Cron (cron-job.org / UptimeRobot)
- **cron-job.org**: Create a free cron job targeting `https://<your-render-url>/ping` every 5 or 10 minutes.
- **UptimeRobot**: Add an HTTP(s) monitor pointing to `https://<your-render-url>/ping` with a 5-minute interval.
- Free, guaranteed 100% uptime with zero downtime.

---

## ⚡ Deployment Summary

| Component | Stack | Hosting Target | Cost |
| :--- | :--- | :--- | :--- |
| **Admin Portal** | Next.js 14, Tailwind CSS, Shadcn UI, Firebase RTDB | **Vercel** | Free |
| **Telegram Bot** | Node.js, grammY, Express 24/7 Keep-Alive | **Render** | Free |
| **Database** | Firebase Realtime Database (RTDB) | **Google Firebase** | Free Tier |
| **Uptime / Cron** | Built-in Self-Ping / cron-job.org | **Render / Cron-job** | Free |

