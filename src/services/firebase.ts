// src/services/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, push } from 'firebase/database';

export const firebaseConfig = {
  apiKey: "AIzaSyCHxgLuBp7YAB_yi3ID-9KofXgKDWpyixA",
  authDomain: "rail-samanvaya.firebaseapp.com",
  databaseURL: "https://rail-samanvaya-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rail-samanvaya",
  storageBucket: "rail-samanvaya.firebasestorage.app",
  messagingSenderId: "703683179581",
  appId: "1:703683179581:web:7329784f91299e995ba654",
  measurementId: "G-633VTJ36XE"
};

// Initialize or reuse existing Firebase app
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const rtdb = getDatabase(app);

export { ref, set, get, onValue, push };
