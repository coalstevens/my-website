// Firestore does not accept nested arrays. Preserve the existing workout format
// as JSON inside independently addressable documents instead.
export function identifyExercises(snapshot, createId = () => crypto.randomUUID()) {
  const next = JSON.parse(JSON.stringify(snapshot));
  const exercises = [...next.state.exercises, ...[...(next.state.archivedSessions || []), ...next.importedWorkouts].flatMap(workout => workout.exercises || [])];
  const normalize = name => String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const known = new Map();
  for (const exercise of exercises) if (exercise.id && normalize(exercise.name) && !known.has(normalize(exercise.name))) known.set(normalize(exercise.name), exercise.id);
  for (const exercise of exercises) {
    const name = normalize(exercise.name);
    if (!exercise.id) exercise.id = (name && known.get(name)) || createId();
    if (name && !known.has(name)) known.set(name, exercise.id);
  }
  return next;
}
export function encode(snapshot) {
  const state = {...snapshot.state};
  delete state.archivedSessions;
  const workouts = new Map();
  for (const workout of [...snapshot.importedWorkouts, ...(snapshot.state.archivedSessions || [])]) {
    if ((snapshot.state.removedArchiveIds || []).includes(workout.id)) continue;
    if (!workout.id || workout.id.includes('/')) throw new Error('Invalid workout ID');
    workouts.set(workout.id, JSON.stringify(workout));
  }
  return {draft: JSON.stringify({state, archiveEdits: snapshot.archiveEdits}), workouts};
}
export function decode(draft, workouts) {
  const {state, archiveEdits} = JSON.parse(draft);
  const all = [...workouts.values()].map(value => JSON.parse(value));
  state.archivedSessions = all.filter(workout => workout.local);
  return {state, archiveEdits, importedWorkouts: all.filter(workout => !workout.local)};
}
export function changes(previous, next) {
  return {
    writes: [...next].filter(([id, data]) => previous.get(id) !== data),
    deletes: [...previous.keys()].filter(id => !next.has(id))
  };
}
