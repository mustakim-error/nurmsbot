# 🤖 NURMS Telegram Bot - Deployment Guide

This is the automated Telegram Product Selling Bot powered by **Node.js**, **grammY**, and **Firebase Firestore Realtime Sync**.

## 🚀 How to Run Locally

1. Open your terminal and navigate to the bot folder:
   ```bash
   cd bot
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
   - Set `CHANNEL_ID` (e.g. `@WarzoneShop`).
   - Set `CHANNEL_LINK` (e.g. `https://t.me/WarzoneShop`).
   - **Crucial:** Add your bot as an **Administrator** in your Telegram channel so it can check membership!

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
3. Connect your GitHub repository (`mustakim-error/nurmsbot`).
4. Set the following configuration:
   - **Root Directory:** `bot`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. In **Environment Variables**, add:
   - `BOT_TOKEN` = `8711373245:AAGRz0PbAJ9tzac3VVr8zg_UBrIloXCT_fg`
   - `CHANNEL_ID` = `@WarzoneShop`
   - `CHANNEL_LINK` = `https://t.me/WarzoneShop`
   - `SHOP_NAME` = `Warzone Shop`
   - `SUPPORT_USERNAME` = `@mustakim_support`
6. Click **Deploy Web Service**! Render will build and launch your bot with the included Express health check server to keep it alive 24/7.
