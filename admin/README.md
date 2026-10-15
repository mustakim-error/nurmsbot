# ⚡ DIGIX Admin Portal - Vercel Deployment Guide

This is the Next.js (Node.js) Admin Portal for the **DIGIX Telegram Store Bot**, featuring real-time Firebase Firestore synchronization.

## 🚀 How to Run Locally

1. Open your terminal and navigate to the admin directory:
   ```bash
   cd digix/admin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   - Copy `.env.example` to `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - Fill in your Firebase web app keys from your [Firebase Console](https://console.firebase.google.com/) (`Project Settings` > `General` > `Your apps` > `Web`).

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ How to Deploy on Vercel (1-Click Free Hosting)

Vercel natively supports Next.js with zero configuration:

1. Push your repository to **GitHub**.
2. Visit [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** > **Project**.
3. Import your GitHub repository.
4. Set the **Root Directory** to `digix/admin`.
5. Under **Environment Variables**, add the 6 variables from your `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
6. Click **Deploy**!
7. Within 1 minute, your admin portal will be live on a fast `.vercel.app` domain!
