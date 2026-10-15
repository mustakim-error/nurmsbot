require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { initializeApp, getApps } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} = require('firebase/firestore');

// Client SDK Config (Direct connection using user's keys)
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

let clientApp;
let clientDb;

try {
  if (!getApps().length) {
    clientApp = initializeApp(firebaseConfig);
  }
  clientDb = getFirestore(clientApp);
  console.log('🔥 Firebase Client Firestore connected to:', firebaseConfig.projectId);
} catch (e) {
  console.warn('⚠️ Client Firestore init note:', e.message);
}

// Check if Admin SDK service account credentials exist
let adminDb = null;
let credential = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(serviceAccount);
  } catch (err) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
  }
}

if (!credential) {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.resolve(__dirname, 'serviceAccountKey.json');

  if (fs.existsSync(keyPath)) {
    try {
      const serviceAccount = require(keyPath);
      credential = admin.credential.cert(serviceAccount);
    } catch (e) {}
  }
}

if (!admin.apps.length && credential) {
  admin.initializeApp({
    credential: credential,
    databaseURL: firebaseConfig.databaseURL,
  });
  adminDb = admin.firestore();
  console.log('⚡ Firebase Admin SDK initialized with Service Account!');
}

// Unified Database Abstraction:
// If adminDb exists, use it. Otherwise, provide a unified Firestore adapter over clientDb
const db = adminDb || {
  collection: (collName) => ({
    doc: (docId) => ({
      get: async () => {
        const docRef = doc(clientDb, collName, String(docId));
        const snap = await getDoc(docRef);
        return {
          exists: snap.exists(),
          data: () => snap.data(),
          id: snap.id,
        };
      },
      set: async (data, options) => {
        const docRef = doc(clientDb, collName, String(docId));
        return await setDoc(docRef, data, options);
      },
      update: async (data) => {
        const docRef = doc(clientDb, collName, String(docId));
        return await updateDoc(docRef, data);
      },
    }),
    add: async (data) => {
      const colRef = collection(clientDb, collName);
      const res = await addDoc(colRef, data);
      return { id: res.id };
    },
    where: (field, op, val) => ({
      get: async () => {
        const q = query(collection(clientDb, collName), where(field, op, val));
        const snap = await getDocs(q);
        const docs = [];
        snap.forEach((d) => docs.push({ id: d.id, exists: true, data: () => d.data() }));
        return {
          forEach: (cb) => docs.forEach(cb),
          size: snap.size,
          docs: docs,
        };
      },
    }),
    get: async () => {
      const colRef = collection(clientDb, collName);
      const snap = await getDocs(colRef);
      const docs = [];
      snap.forEach((d) => docs.push({ id: d.id, exists: true, data: () => d.data() }));
      return {
        forEach: (cb) => docs.forEach(cb),
        size: snap.size,
        docs: docs,
      };
    },
    onSnapshot: (callback) => {
      const colRef = collection(clientDb, collName);
      return onSnapshot(colRef, (snap) => {
        const docs = [];
        snap.forEach((d) => docs.push({ id: d.id, exists: true, data: () => d.data() }));
        callback({
          forEach: (cb) => docs.forEach(cb),
          size: snap.size,
          docs: docs,
        });
      });
    },
  }),
};

module.exports = { admin, db, clientDb };
