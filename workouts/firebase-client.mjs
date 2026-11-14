import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {getFirestore, doc, collection, getDocFromServer, getDocsFromServer} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';

export const app = initializeApp({
  apiKey:'AIzaSyA1Hi7-tHSzwoEolRPaV7dvYIvecOLNxpI',
  authDomain:'my-website-cs.firebaseapp.com', projectId:'my-website-cs',
  storageBucket:'my-website-cs.firebasestorage.app', messagingSenderId:'651229908472',
  appId:'1:651229908472:web:4f43a9079a4e6b53f6da0d'
});
export const auth = getAuth(app);
export const db = getFirestore(app);
export const cacheKey = uid => `training-account-v3:${uid}`;
let tabId;
try {
  tabId = sessionStorage.getItem('training-tab-v3') || crypto.randomUUID();
  sessionStorage.setItem('training-tab-v3', tabId);
} catch { tabId = crypto.randomUUID(); }
export const pendingKey = uid => `${cacheKey(uid)}:pending:${tabId}`;
export function readAccountCache(uid) {
  return JSON.parse(localStorage.getItem(pendingKey(uid)) || localStorage.getItem(cacheKey(uid)) || 'null');
}
export const metadata = uid => doc(db, 'users', uid, 'drafts', 'current');
export const workoutRef = (uid, id) => doc(db, 'users', uid, 'workouts', id);
export async function readCloud(uid) {
  // The transaction that writes the draft revision also writes the archive.
  // Read the revision on both sides to detect a concurrent collection change.
  const before = await getDocFromServer(metadata(uid));
  const docs = await getDocsFromServer(collection(db, 'users', uid, 'workouts'));
  const after = await getDocFromServer(metadata(uid));
  if ((before.data()?.revision || 0) !== (after.data()?.revision || 0)) {
    throw new Error('Cloud data changed while loading. Retrying is safe.');
  }
  if (!after.exists() && !docs.empty) throw new Error('Archive exists without a draft. Please contact the site owner.');
  return {exists:after.exists(), revision:after.data()?.revision || 0,
    draft:after.data()?.data, workouts:new Map(docs.docs.map(item => [item.id, item.data().data]))};
}
