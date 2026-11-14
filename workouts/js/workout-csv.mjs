// CSV is a portable view including the current draft and pending local edits.
// Source columns retain ambiguous legacy results instead of guessing their units.
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^\s*[=+\-@]|^[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function displayResults(exercise, values) {
  const weight = exercise.fields.findIndex(field => /weight/i.test(field));
  const indices = exercise.fields.map((_, i) => i).filter(i => i !== weight);
  const split = exercise.measurement === 'repeaters' && !exercise.fields.some(field => /reps ×/i.test(field));
  const result = side => {
    if (side && !exercise.unilateral) return '';
    if (split) {
      const reps = values[indices[side*2]] ?? '', seconds = values[indices[side*2+1]] ?? '';
      return reps === '' && seconds === '' ? '' : `${reps} × ${seconds}s`;
    }
    const index = indices[side], value = values[index] ?? '';
    return value === '' ? '' : `${value}${/seconds/i.test(exercise.fields[index] || '') ? 's' : ''}`;
  };
  return [weight < 0 ? '' : values[weight], result(0), result(1)];
}
export function workoutCSV(snapshot) {
  const header = ['session_id','date','status','exercise_id','exercise_name','set_number','weight_or_setup','result_left_or_both','result_right','exercise_notes','session_notes','field_labels','source_heading','source_row'];
  const rows = [header];
  const removed = new Set(snapshot.state.removedArchiveIds || []);
  const archive = new Map([...snapshot.importedWorkouts, ...(snapshot.state.archivedSessions || [])].map(workout => [workout.id, workout]));
  for (const workout of archive.values()) {
    if (removed.has(workout.id)) continue;
    const metadata = (workout.exercises || []).flatMap(exercise => exercise.values.map((_, index) => ({exercise, set:index+1})));
    const effectiveRows = workout.rows.map((source, ri) => source.map((value, ci) => snapshot.archiveEdits[`${workout.id}:${ri}:${ci}`] ?? value));
    const noteRow = effectiveRows.find(row => /^session notes$/i.test(String(row[0]).trim()));
    const sessionNotes = noteRow ? noteRow[4] || '' : workout.notes || '';
    let name = '', set = 0;
    effectiveRows.forEach((row, ri) => {
      if (!row.some(value => String(value ?? '').trim())) return;
      if (row[0]) { name = row[0]; set = 0; }
      const item = metadata[ri];
      const exercise = item?.exercise;
      rows.push([workout.id, workout.date, 'archived', exercise?.id || '', name, item?.set || ++set,
        row[1], row[2], row[3], exercise ? (item.set === 1 ? (Object.hasOwn(snapshot.archiveEdits, `${workout.id}:${ri}:4`) ? row[4] : row[4] || exercise.notes || '') : exercise.notes || '') : row.slice(4).join(' · '),
        sessionNotes, JSON.stringify(exercise?.fields || []), JSON.stringify(workout.heading || []), JSON.stringify(row)]);
    });
  }
  for (const exercise of snapshot.state.exercises) {
    exercise.values.forEach((values, index) => {
      rows.push(['current', snapshot.state.date, 'draft', exercise.id || '', exercise.name, index+1,
        ...displayResults(exercise, values), exercise.notes || '', snapshot.state.notes || '', JSON.stringify(exercise.fields), '', JSON.stringify(values)]);
    });
  }
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
export function downloadCSV(snapshot, prefix = 'workouts') {
  const url = URL.createObjectURL(new Blob(['\uFEFF', workoutCSV(snapshot)], {type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${prefix}-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
