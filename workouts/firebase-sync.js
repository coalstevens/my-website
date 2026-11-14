import {GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {runTransaction, serverTimestamp, onSnapshot} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import {auth, db, cacheKey, pendingKey, readAccountCache, metadata, workoutRef, readCloud} from './firebase-client.mjs';
import {encode, decode, changes, identifyExercises} from './cloud-model.mjs';
import {downloadCSV} from './workout-csv.mjs';

const $ = id => document.getElementById(id);
const bridge = () => window.WorkoutCloudBridge;
let user = null, revision = 0, baseline = new Map();
let connected = false, dirty = false, conflict = false, saving = false, loading = false;
let generation = 0, timer, unsubscribe, refreshAgain = false;
const message = text => { $('cloud-status').textContent = text; };
function controls() {
  $('cloud-signin').hidden = Boolean(user);
  $('cloud-signout').hidden = !user;
  $('cloud-account').textContent = user?.email || '';
  $('demo-reset').hidden = Boolean(user);
  $('cloud-resolve').hidden = !conflict;
  $('cloud-resolve').disabled = loading || saving;
  $('cloud-retry').hidden = !user || (!dirty && connected && !conflict);
  $('cloud-retry').disabled = loading || saving || conflict;
  $('cloud-export').disabled = !bridge()?.ready || Boolean(user && !connected);
}
function persist() {
  if (!user || !connected) return true;
  try {
    const serialized = JSON.stringify({snapshot:bridge().snapshot(), revision, baseline:[...baseline], dirty});
    // Keep each tab's outbox separate so another tab cannot erase pending edits.
    if (dirty) localStorage.setItem(pendingKey(user.uid), serialized);
    localStorage.setItem(cacheKey(user.uid), serialized);
    if (!dirty) localStorage.removeItem(pendingKey(user.uid));
    return true;
  } catch (error) {
    console.error('Pending-workout cache failed', error);
    message('Browser storage is full or unavailable. Keep this tab open until cloud saving succeeds.');
    return false;
  }
}
function explain(error) {
  console.error('Firebase workout sync:', error);
  if (error.code === 'permission-denied') return 'Access denied. Check the Firestore access rules.';
  if (error.code === 'auth/unauthorized-domain') return 'Authorize this hostname in Firebase Authentication settings.';
  if (error.code === 'auth/popup-blocked') return 'Allow the Google sign-in popup and try again.';
  if (error.code === 'auth/popup-closed-by-user') return 'Sign-in cancelled. You are still in the demo.';
  return error.message || 'Connection unavailable.';
}
function showConflict() {
  conflict = true;
  bridge().lock(true);
  persist();
  message('Another device has newer changes. Your pending edits are preserved. Download CSV before choosing “use latest cloud version”; changes will not be merged automatically.');
  controls();
}
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(sync, 1200);
}
async function sync() {
  clearTimeout(timer);
  if (!user || !connected || !dirty || conflict || saving || loading) return;
  const token = generation, uid = user.uid, expected = revision;
  const snapshot = bridge().snapshot();
  const serialized = JSON.stringify(snapshot);
  saving = true;
  message(navigator.onLine ? 'Saving…' : 'Offline · changes pending. They will sync when the connection returns.');
  controls();
  try {
    const next = encode(snapshot);
    const diff = changes(baseline, next.workouts);
    if (diff.writes.length + diff.deletes.length > 400) throw new Error('Too many archive changes in one save. Download CSV and contact the site owner.');
    await runTransaction(db, async transaction => {
      const current = await transaction.get(metadata(uid));
      if ((current.data()?.revision || 0) !== expected) {
        const error = new Error('Newer cloud revision');
        error.code = 'workout/conflict';
        throw error;
      }
      for (const [id, data] of diff.writes) transaction.set(workoutRef(uid, id), {data});
      for (const id of diff.deletes) transaction.delete(workoutRef(uid, id));
      transaction.set(metadata(uid), {data:next.draft, revision:expected+1, updatedAt:serverTimestamp()});
    });
    if (token !== generation) return;
    baseline = next.workouts;
    revision = expected + 1;
    dirty = JSON.stringify(bridge().snapshot()) !== serialized;
    persist();
    message(dirty ? 'Saved locally · saving your latest edits…' : 'Saved · synced to your account.');
    if (dirty) schedule();
  } catch (error) {
    if (token !== generation) return;
    if (error.code === 'workout/conflict') showConflict();
    else message(`${explain(error)} Changes are pending on this device; retry when connected.`);
  } finally {
    if (token === generation) {
      saving = false;
      controls();
      if (refreshAgain) { refreshAgain = false; refresh(); }
    }
  }
}
async function refresh(discardPending = false) {
  if (!user) return;
  if (loading || saving) { refreshAgain = true; return; }
  const token = generation, uid = user.uid;
  loading = true;
  controls();
  try {
    const remote = await readCloud(uid);
    if (token !== generation) return;
    // Edits made while this read was running are included in this check.
    if (dirty && !discardPending) {
      if (remote.revision !== revision) { showConflict(); return; }
      message('Connected · saving pending changes…');
      return;
    }
    if (connected && remote.exists && remote.revision === revision && !discardPending) {
      bridge().lock(false);
      message('Saved · synced to your account.');
      return;
    }
    const snapshot = remote.exists ? decode(remote.draft, remote.workouts) : bridge().blank();
    bridge().apply(identifyExercises(snapshot), uid);
    revision = remote.revision;
    baseline = remote.workouts;
    connected = true; conflict = false; dirty = !remote.exists;
    persist();
    bridge().lock(false);
    message(dirty ? 'Creating your workout log…' : 'Saved · synced to your account.');
  } catch (error) {
    if (token !== generation) return;
    message(`${explain(error)} ${connected ? 'Your account’s cached workouts remain available.' : 'Could not load your account. Retry to continue; no empty log has been created.'}`);
  } finally {
    if (token === generation) {
      loading = false;
      controls();
      if (dirty && !conflict) schedule();
      if (refreshAgain) { refreshAgain = false; setTimeout(refresh, 250); }
    }
  }
}
function watch(uid, token) {
  unsubscribe = onSnapshot(metadata(uid), {includeMetadataChanges:true}, snapshot => {
    if (token !== generation || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    const remoteRevision = snapshot.data()?.revision || 0;
    if (remoteRevision !== revision) refresh();
  }, error => {
    if (token !== generation) return;
    message(`${explain(error)} Live updates unavailable; use retry connection.`);
    $('cloud-retry').hidden = false;
  });
}
window.addEventListener('workout-local-change', () => {
  if (!user || !connected) return; // Demo edits can never enter an account.
  dirty = true;
  if (persist()) message(navigator.onLine ? 'Saved on this device · saving…' : 'Offline · changes pending on this device.');
  schedule();
  controls();
});
window.addEventListener('online', () => refresh());
window.addEventListener('offline', () => {
  if (user) message(dirty ? 'Offline · changes pending on this device.' : 'Offline · showing your account’s cached workouts.');
});
window.addEventListener('beforeunload', event => {
  if (saving || dirty) { event.preventDefault(); event.returnValue = ''; }
});
$('cloud-signin').addEventListener('click', async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (error) { message(explain(error)); }
});
$('cloud-signout').addEventListener('click', async () => {
  if (dirty && !persist()) {
    if (!confirm('Pending edits could not be saved in this browser. Download CSV before signing out. Sign out anyway?')) return;
  }
  try { await signOut(auth); }
  catch (error) { message(explain(error)); }
});
$('cloud-retry').addEventListener('click', () => refresh());
$('cloud-resolve').addEventListener('click', () => {
  if (!confirm('Use the newer cloud version and discard this device’s pending edits? Download CSV first to keep a portable copy.')) return;
  try { localStorage.setItem(`${cacheKey(user.uid)}:before-conflict`, JSON.stringify(readAccountCache(user.uid))); }
  catch { message('Could not preserve a recovery copy. Download CSV before resolving.'); return; }
  refresh(true);
});
$('cloud-export').addEventListener('click', () => downloadCSV(bridge().snapshot(), user ? 'workouts' : 'workout-demo'));
$('demo-reset').addEventListener('click', () => {
  bridge().demo();
  message('Demo reset · sign in to save your own workouts.');
});
async function start(account) {
  const token = ++generation;
  clearTimeout(timer);
  unsubscribe?.();
  user = account; revision = 0; baseline = new Map();
  connected = false; dirty = false; conflict = false; saving = false; loading = false; refreshAgain = false;
  // Immediately remove the previous account's view, even while offline.
  bridge().demo();
  if (!account) {
    message('Demo · sign in to save your own workouts.');
    controls();
    return;
  }
  bridge().lock(true);
  message('Loading your workouts…');
  try {
    const cached = readAccountCache(account.uid);
    if (cached) {
      bridge().apply(identifyExercises(cached.snapshot), account.uid);
      revision = cached.revision;
      baseline = new Map(cached.baseline);
      dirty = Boolean(cached.dirty);
      connected = true;
      bridge().lock(false);
    }
  } catch (error) { console.warn('Account cache could not be restored', error); }
  controls();
  await refresh();
  if (token !== generation) return;
  watch(account.uid, token);
}
if (!bridge()?.ready) await new Promise(resolve => window.addEventListener('workout-history-ready', resolve, {once:true}));
onAuthStateChanged(auth, start);
controls();
