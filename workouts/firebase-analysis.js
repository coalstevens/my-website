import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js';
import {onSnapshot} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js';
import {auth, cacheKey, readAccountCache, metadata, readCloud} from './firebase-client.mjs';
import {decode} from './cloud-model.mjs';
const bridge = window.WorkoutAnalysisBridge;
const empty = () => ({state:{exercises:[], archivedSessions:[]}, archiveEdits:{}, importedWorkouts:[]});
let user, generation = 0, unsubscribe, loading = false, again = false;
function cached() {
  try { return readAccountCache(user.uid); }
  catch { return null; }
}
async function refresh() {
  if (!user) return;
  if (loading) { again = true; return; }
  loading = true;
  const token = generation, uid = user.uid;
  try {
    const cache = cached();
    if (cache) bridge.apply(cache.snapshot, cache.dirty ? 'Includes pending changes saved on this device.' : '');
    const remote = await readCloud(uid);
    if (token !== generation) return;
    const latestCache = cached();
    if (latestCache?.dirty) bridge.apply(latestCache.snapshot, 'Includes pending device changes. Return to the workout page to sync or resolve conflicts.');
    else bridge.apply(remote.exists ? decode(remote.draft, remote.workouts) : empty(), remote.exists ? '' : 'No archived workouts yet.');
  } catch (error) {
    if (token === generation) bridge.message(`${error.message} ${cached() ? 'Showing this account’s cached data.' : 'Account history could not load.'}`);
  } finally {
    if (token === generation) {
      loading = false;
      if (again) { again = false; refresh(); }
    }
  }
}
onAuthStateChanged(auth, async account => {
  const token = ++generation;
  unsubscribe?.();
  user = account; loading = false; again = false;
  bridge.apply(empty(), account ? 'Loading your history…' : 'Loading demo history…', true);
  if (!account) {
    try {
      const response = await fetch('history.json');
      if (!response.ok) throw new Error('Could not load demo history.');
      const data = await response.json();
      if (token === generation) bridge.apply({...empty(), importedWorkouts:data.workouts}, 'Demo history · sign in on the workout page to view your own log.', true);
    } catch (error) { if (token === generation) bridge.message(error.message); }
    return;
  }
  await refresh();
  if (token !== generation) return;
  unsubscribe = onSnapshot(metadata(account.uid), snapshot => {
    if (token === generation && !snapshot.metadata.fromCache) refresh();
  }, error => { if (token === generation) bridge.message(error.message); });
});
window.addEventListener('storage', event => {
  if (user && event.key === cacheKey(user.uid)) refresh();
});
window.addEventListener('online', refresh);
