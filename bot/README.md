# 🤖 DIGIX Telegram Bot - Deployment Guide

This is the automated Telegram Product Selling Bot powered by **Node.js**, **grammY**, and **Firebase Firestore Realtime Sync**.

## 🚀 How to Run Locally

1. Open your terminal and navigate to the bot folder:
   ```bash
   cd digix/bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Obtain your bot token from [@BotFather](https://t.me/BotFather) on Telegram and set `BOT_TOKEN`.
   - Download your Firebase Service Account JSON from Firebase Console:
     - Go to `Project Settings` > `Service Accounts` > `Generate new private key`.
     - Save it as `serviceAccountKey.json` inside this `bot/` folder.
   - Set `CHANNEL_ID` (e.g. `@YourOfficialChannel` or `-100xxxxxxx`).
   - **Crucial:** Add your bot as an **Administrator** in your Telegram channel so it can check membership (`can_manage_chat` or standard admin permissions)!

4. Start the bot:
   ```bash
   npm start
   # or for auto-reload during development:
   npm run dev
   ```

---

## ☁️ How to Deploy on Render (24/7 Free)

Render allows you to host this bot 24/7 with zero cost:

1. Push your project to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Set the following configuration:
   - **Root Directory:** `digix/bot`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. In **Environment Variables**, add:
   - `BOT_TOKEN` = `your_telegram_bot_token`
   - `CHANNEL_ID` = `@YourOfficialChannel`
   - `CHANNEL_LINK` = `https://t.me/YourOfficialChannel`
   - `SHOP_NAME` = `Warzone Shop`
   - `SUPPORT_USERNAME` = `@YourSupportHandle`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = *Paste the full content of your `serviceAccountKey.json` as a single line string*
6. Click **Deploy Web Service**! Render will build and launch your bot with the included Express health check server to keep it alive 24/7.
