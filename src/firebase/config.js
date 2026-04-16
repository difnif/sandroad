import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Use initializeAuth (instead of getAuth) so we can pin persistence explicitly.
// Order matters: indexedDB first (survives more scenarios including some PWA/WebView
// contexts where localStorage is isolated), then localStorage as fallback.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver
});

export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
