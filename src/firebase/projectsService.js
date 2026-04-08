import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from './config.js';

// Path: users/{uid}/projects/{projectId}
const projectsCol = (uid) => collection(db, 'users', uid, 'projects');
const projectDoc = (uid, pid) => doc(db, 'users', uid, 'projects', pid);

export async function listProjects(uid) {
  const q = query(projectsCol(uid), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeProjectsList(uid, callback) {
  const q = query(projectsCol(uid), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export async function getProject(uid, pid) {
  const snap = await getDoc(projectDoc(uid, pid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeProject(uid, pid, callback) {
  return onSnapshot(projectDoc(uid, pid), (snap) => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() });
    else callback(null);
  });
}

export async function createProject(uid, project) {
  const ref = projectDoc(uid, project.id);
  await setDoc(ref, { ...project, updatedAt: serverTimestamp() });
  return project;
}

export async function saveProject(uid, project) {
  const ref = projectDoc(uid, project.id);
  await setDoc(ref, { ...project, updatedAt: serverTimestamp() }, { merge: true });
}

export async function renameProject(uid, pid, name) {
  await updateDoc(projectDoc(uid, pid), { name, updatedAt: serverTimestamp() });
}

export async function deleteProject(uid, pid) {
  await deleteDoc(projectDoc(uid, pid));
}
