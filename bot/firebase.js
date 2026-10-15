require('dotenv').config();
const { initializeApp, getApps } = require('firebase/app');
const { getDatabase } = require('firebase/database');

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDCt5yssQM7oDjYLXcl3foq7KOF5MN1GXg",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "nurms-bot.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nurms-bot-default-rtdb.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "nurms-bot",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "nurms-bot.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "1081400118371",
  appId: process.env.FIREBASE_APP_ID || "1:1081400118371:web:d6b69b66f84a2463bbfc56",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-5GYQ7SR6HJ"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const rtdb = getDatabase(app);

console.log('⚡ Firebase Realtime Database connected to:', firebaseConfig.databaseURL);

module.exports = { app, rtdb };
