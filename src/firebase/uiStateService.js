import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config.js';

// Path: users/{uid}/settings/{docId}
const settingsDoc = (uid, docId) => doc(db, 'users', uid, 'settings', docId);

export async function getUIState(uid) {
  const snap = await getDoc(settingsDoc(uid, 'ui'));
  return snap.exists() ? snap.data() : null;
}

export async function saveUIState(uid, state) {
  await setDoc(settingsDoc(uid, 'ui'), state, { merge: true });
}

export async function getDashboardSettings(uid) {
  const snap = await getDoc(settingsDoc(uid, 'dashboard'));
  return snap.exists() ? snap.data() : null;
}

export async function saveDashboardSettings(uid, settings) {
  await setDoc(settingsDoc(uid, 'dashboard'), settings, { merge: true });
}
