/* Build an archive entry and a fresh session without mutating the active one. */
const SessionArchive = (() => {
  function prepare(current, nextDate, id) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(current.date) ||
        !Number.isFinite(Date.parse(current.date)) ||
        new Date(current.date).toISOString().slice(0,10) !== current.date) {
      throw new Error('choose a valid workout date before archiving.');
    }
    const hasValues = current.exercises.some(e => e.values.some(row => row.some(value => String(value ?? '').trim() !== '')));
    if (!hasValues && !current.notes?.trim()) throw new Error('this session is empty. add results or notes before archiving.');
    const copy = value => JSON.parse(JSON.stringify(value));
    const label = new Date(`${current.date}T12:00:00`).toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric'});
    const rows = [];
    for (const exercise of current.exercises) {
      const weight = exercise.fields.findIndex(field => /weight/i.test(field));
      const resultFields = exercise.fields.map((_, i) => i).filter(i => i !== weight);
      const result = (row, i) => {
        if (i === undefined || row[i] === '' || row[i] == null) return '';
        return String(row[i]) + (/seconds/i.test(exercise.fields[i]) && !/reps ×/i.test(exercise.fields[i]) ? 's' : '');
      };
      const splitRepeaters = exercise.measurement === 'repeaters' && !exercise.fields.some(field => /reps ×/i.test(field));
      const sideResult = (row, side) => {
        if (!splitRepeaters) return result(row,resultFields[side]);
        if (side === 1 && !exercise.unilateral) return '';
        const reps = row[resultFields[side*2]] ?? '';
        const duration = row[resultFields[side*2+1]] ?? '';
        return reps === '' && duration === '' ? '' : `${reps} × ${duration}s`;
      };
      exercise.values.forEach((row, i) => rows.push([
        i === 0 ? exercise.name : '',
        weight < 0 ? '' : String(row[weight] ?? ''),
        sideResult(row,0), sideResult(row,1), ''
      ]));
    }
    if (current.notes?.trim()) rows.push(['session notes','','','',current.notes]);
    const entry = {
      id, date:current.date, label, local:true,
      heading:[label,'weight / setup','left / both','right','notes'], rows,
      // Retain the complete template, not just its table representation.
      exercises:copy(current.exercises)
    };
    const next = copy(current);
    next.date = nextDate;
    next.notes = '';
    next.archivedSessions = [entry, ...(current.archivedSessions || [])];
    for (const exercise of next.exercises) {
      delete exercise.measurementBackup;
      delete exercise.resultRightBackup;
      exercise.previous = copy(exercise.values);
      exercise.values = exercise.values.map(row => row.map(() => ''));
      if (exercise.weightBackup) {
        exercise.weightBackup.previous = [...exercise.weightBackup.values];
        exercise.weightBackup.values = exercise.weightBackup.values.map(() => '');
      }
      if (exercise.rightBackup) {
        exercise.rightBackup.previous = [...exercise.rightBackup.values];
        exercise.rightBackup.values = exercise.rightBackup.values.map(() => '');
      }
    }
    return {entry,next};
  }
  function restore(current, entry, edits = {}) {
    const copy = value => JSON.parse(JSON.stringify(value));
    const rows = entry.rows.map((row, ri) => row.map((value, ci) => {
      const key = `${entry.id}:${ri}:${ci}`;
      return String(Object.hasOwn(edits, key) ? edits[key] : value ?? '');
    }));
    let exercises;
    const notes = [];
    if (entry.exercises) {
      exercises = copy(entry.exercises);
      let ri = 0;
      for (const exercise of exercises) {
        const weight = exercise.fields.findIndex(field => /weight/i.test(field));
        const results = exercise.fields.map((_, i) => i).filter(i => i !== weight);
        exercise.values = exercise.values.map((values, index) => {
          const row = rows[ri++];
          if (index === 0 && row[0]) exercise.name = row[0];
          const updated = [...values];
          if (weight >= 0) updated[weight] = row[1];
          const splitRepeaters = exercise.measurement === 'repeaters' && !exercise.fields.some(field => /reps ×/i.test(field));
          results.forEach((field, i) => {
            if (splitRepeaters) {
              const value = row[2+Math.floor(i/2)] || '';
              const match = value.match(/^\s*(.*?)\s*[×x*]\s*(.*?)\s*s?\s*$/i);
              updated[field] = match ? (i%2 === 0 ? match[1] : match[2].replace(/s$/i,'')) : i%2 === 0 ? value : '';
            } else {
              updated[field] = /seconds/i.test(exercise.fields[field]) && !/reps ×/i.test(exercise.fields[field]) ? row[i+2].replace(/s$/i,'') : row[i+2];
            }
          });
          return updated;
        });
      }
      rows.slice(ri).forEach(row => { if (row[4]) notes.push(row[4]); });
    } else {
      // Legacy CSV labels can be exercise names OR setup instructions. Keep
      // every named source row as a block rather than discard ambiguous text.
      exercises = [];
      let exercise;
      let fields = ['Weight / setup','Result 1','Result 2'];
      for (const row of rows) {
        if (!row.some(value => value.trim())) continue;
        const headers = /^(?:weight(?:\s+(?:lbs?|kg))?|l|r|left|right|l\s*\/\s*b|r\s*\/\s*b|right\/both|reps [rl])$/i;
        const isHeader = row.slice(1,4).some(value => headers.test(value.trim()));
        if (isHeader) {
          fields = [row[1] || fields[0], row[2] || fields[1], row[3] || fields[2]];
          if (row[0]) { exercise = {name:row[0],fields:[...fields],values:[],previous:[],barbell:false,unilateral:false,superset:''}; exercises.push(exercise); }
          continue;
        }
        if (row[0] || !exercise) {
          exercise = {name:row[0] || 'unnamed exercise',fields:[...fields],values:[],previous:[],barbell:false,unilateral:false,superset:''};
          exercises.push(exercise);
        }
        const values = [row[1] || '',row[2] || '',row[3] || ''];
        exercise.values.push(values);
        exercise.previous.push([...values]);
        row.slice(4).forEach(value => { if (value.trim()) notes.push(`${exercise.name}: ${value}`); });
      }
      for (const exercise of exercises) {
        if (!exercise.values.length) { exercise.values.push(['','','']); exercise.previous.push(['','','']); }
      }
      entry.heading.slice(1).forEach(value => {
        if (value && !/^(?:weight|l|r|left|right|l\s*\/\s*b)$/i.test(value.trim())) notes.push(value);
      });
    }
    return {
      ...copy(current), date:entry.date, notes:notes.join('\n'), exercises,
      archivedSessions:(current.archivedSessions || []).filter(workout => workout.id !== entry.id),
      removedArchiveIds:entry.local ? [...(current.removedArchiveIds || [])] : [...new Set([...(current.removedArchiveIds || []),entry.id])]
    };
  }
  return {prepare,restore};
})();
if (typeof module !== 'undefined') module.exports = SessionArchive;
