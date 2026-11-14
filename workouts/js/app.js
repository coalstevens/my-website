const pageSayings = [
  ['Back to work.', 'Same foundation. A little further.'],
  ['Pick up the thread.', 'Right where you left off.'],
  ['Another page.', 'A few more lines in the log.'],
  ['Keep showing up.', 'The quiet part of getting stronger.'],
  ['Nothing fancy.', 'Good form. Honest effort.'],
  ['Build on it.', 'Last time was a starting point.'],
  ['A little further.', 'No need to rush the distance.'],
  ['Find your footing.', 'Then move with intention.'],
  ['Put in the work.', 'Let the numbers tell the story.'],
  ['Make a little room.', 'For something you couldn’t do before.'],
  ['One set at a time.', 'That’s the whole plan for now.'],
  ['Steady does it.', 'Small gains have a way of adding up.'],
  ['Here again.', 'That counts for something.'],
  ['Keep the thread.', 'Consistency over spectacle.'],
  ['Start where you are.', 'There’s work worth doing here.'],
  ['Take your time.', 'Strong foundations aren’t rushed.'],
  ['Work in progress.', 'Exactly where you’re supposed to be.'],
  ['A familiar rhythm.', 'Breathe. Lift. Write it down.'],
  ['See what’s there.', 'Some days surprise you.'],
  ['Leave a record.', 'Something to build on next time.'],
  ['Gravity called.', 'It’s not willing to negotiate.'],
  ['Recreational suffering.', 'Apparently this is the hobby we chose.'],
  ['The spreadsheet wants answers.', 'Preferably numbers larger than last time.'],
  ['Professionally tired.', 'Recreationally employed.'],
  ['A very expensive hang.', 'Could’ve stayed on the couch for free.'],
  ['Must be the conditions.', 'Couldn’t possibly be the training.'],
  ['One more attempt.', 'A legally meaningless phrase.'],
  ['Strong enough to complain.', 'Let’s see what else you’ve got.'],
  ['Trust the feet.', 'Those things you keep cutting.'],
  ['Basically a rest day.', 'If you don’t count any of this.'],
  ['The holds got smaller.', 'Definitely not a strength issue.'],
  ['Chalk is not a strategy.', 'But go ahead. One more dip.'],
  ['Try pulling harder.', 'Groundbreaking coaching. No charge.'],
  ['A project of a person.', 'Still working out the beta.'],
  ['Warm-up complete.', 'Emotionally, we have not started.'],
  ['Nice controlled descent.', 'Other people might call it falling.'],
  ['Logging the evidence.', 'In case you claim that felt easy later.'],
  ['All this for a rock.', 'Not even taking it home.'],
  ['Just one weak link.', 'Unfortunately it keeps moving around.'],
  ['Your shoes are fine.', 'An upsetting development for the excuses department.']
];
// Change the paired heading on each visit, not while someone is logging.
let sayingIndex = Math.floor(Math.random() * pageSayings.length);
try {
  const last = Number(sessionStorage.getItem('training-last-saying') ?? -1);
  if (sayingIndex === last) sayingIndex = (sayingIndex + 1) % pageSayings.length;
  sessionStorage.setItem('training-last-saying', String(sayingIndex));
} catch {}
document.querySelector('#page-title').textContent = pageSayings[sayingIndex][0];
document.querySelector('#page-subtitle').textContent = pageSayings[sayingIndex][1];
const key = 'training-design-prototype-v1';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const sample = () => ({date: today(), notes: '', exercises: [
  {name:'Squat', barbell:true, fields:['Weight · lb','Reps'], previous:[[175,8],[175,7],[175,6]], values:[[175,8],[175,7],[175,6]]},
  {name:'Explosive pull-up', superset:'A', fields:['Reps'], previous:[[2],[2],[2],[2]], values:[[2],[2],[2],[2]]},
  {name:'Bat hang', superset:'A', fields:['Hold · seconds'], previous:[[9],[7],[4],[3]], values:[[9],[7],[4],[3]]},
  {name:'Lock-off · 90°', fields:['Left · seconds','Right · seconds'], previous:[[4,6],[5,7],[4,5],[3,3]], values:[[4,6],[5,7],[4,5],[3,3]]}
]});
// Demo state never reads private account state. Preserve pre-account data for
// an intentional migration rather than importing it into every new user.
try {
  if (!localStorage.getItem('training-view-scope-v2') && localStorage.getItem(key)) {
    localStorage.setItem('training-legacy-backup-v2', JSON.stringify({state:JSON.parse(localStorage.getItem(key)), archiveEdits:JSON.parse(localStorage.getItem('training-archive-cell-edits-v1') || '{}')}));
  }
} catch {}
let viewScope = 'demo';
let state = sample();
const newExercise = () => ({id:crypto.randomUUID(), name:'', notes:'', fields:['Reps'], values:[[''],[''],['']], previous:[[''],[''],['']], weighted:false, barbell:false, unilateral:false, superset:'', measurement:'reps'});
const blankSession = () => ({date:today(), notes:'', exercises:Array.from({length:4}, newExercise), archivedSessions:[]});
function storeWorkingCopy() {
  localStorage.setItem(key, JSON.stringify(state));
  localStorage.setItem('training-view-scope-v2', viewScope);
}
const pencilIcon = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="m10.5 2.5 3 3M2 14l3.5-1 8-8a2.12 2.12 0 0 0-3-3l-8 8L2 14Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const archiveFeedback = ArchiveFeedback.create(document.querySelector('#archive-action-status'));
function notifyCloud() {
  archiveFeedback.clear();
  window.dispatchEvent(new Event('workout-local-change'));
}
function showArchiveUndo(message, previousState, previousArchiveId) {
  archiveFeedback.show(message, () => {
    try { localStorage.setItem(key, JSON.stringify(previousState)); }
    catch {
      document.querySelector('#archive-action-status > span').textContent = 'could not undo locally — try again';
      return false;
    }
    state = previousState;
    activeArchiveId = previousArchiveId;
    editingExercises.clear();
    render();
    updatePlateSuggestions();
    renderHistory();
    notifyCloud();
    document.querySelector('#push-archive').focus();
    return true;
  });
}
function save() {
  try { storeWorkingCopy(); document.querySelector('#save-status').textContent = viewScope === 'demo' ? 'Demo changes only' : 'Saved locally · syncing'; }
  catch { document.querySelector('#save-status').textContent = 'Unable to save locally — keep this tab open'; }
  notifyCloud();
}
function setWeighted(exercise, weighted) {
  const index = exercise.fields.findIndex(field => /weight/i.test(field));
  if (weighted && index < 0) {
    exercise.fields.unshift(exercise.weightBackup?.label || 'Weight · lb');
    for (const property of ['values', 'previous']) {
      exercise[property].forEach((row, i) => row.unshift(exercise.weightBackup?.[property]?.[i] ?? ''));
    }
  } else if (!weighted && index >= 0) {
    exercise.weightBackup = {label:exercise.fields[index]};
    for (const property of ['values', 'previous']) {
      exercise.weightBackup[property] = exercise[property].map(row => row.splice(index,1)[0]);
    }
    exercise.fields.splice(index,1);
  }
  exercise.weighted = weighted;
  if (!weighted) exercise.barbell = false;
}
const setMeasurement = ExerciseFields.setMeasurement;
const setLaterality = ExerciseFields.setLaterality;
const editingExercises = new Set();
function exerciseModifiers(exercise, ei) {
  return `<div class="exercise-modifiers">
    <div class="exercise-toggle-options"><label><input type="checkbox" data-weighted="${ei}" ${exercise.weighted ? 'checked' : ''}> weighted</label>
    <label><input type="checkbox" data-barbell="${ei}" ${exercise.barbell ? 'checked' : ''}> barbell</label>
    <label><input type="checkbox" data-unilateral="${ei}" ${exercise.unilateral ? 'checked' : ''}> unilateral</label></div>
    <div class="exercise-select-options"><label class="set-count-control"><span>sets</span><select data-set-count="${ei}" aria-label="${escape(exercise.name)} number of sets">${Array.from({length:Math.max(20,exercise.values.length)},(_,i)=>`<option value="${i+1}" ${exercise.values.length === i+1 ? 'selected' : ''}>${i+1}</option>`).join('')}</select></label>
    <label class="measurement-control"><span>measure</span><select data-measurement="${ei}" aria-label="${escape(exercise.name)} measurement"><option value="reps" ${exercise.measurement === 'reps' ? 'selected' : ''}>reps</option><option value="duration" ${exercise.measurement === 'duration' ? 'selected' : ''}>duration</option><option value="repeaters" ${exercise.measurement === 'repeaters' ? 'selected' : ''}>repeaters</option></select></label>
    <label class="superset-control"><span>superset</span><select data-superset="${ei}" aria-label="${escape(exercise.name)} superset group"><option value="">none</option>${['A','B','C','D'].map(group => `<option value="${group}" ${exercise.superset === group ? 'selected' : ''}>${group.toLowerCase()}</option>`).join('')}</select></label></div>
  </div>`;
}
function formatWorkoutDate(value) {
  if (!value) return 'choose date';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'choose date' : date.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
}
let currentAnalysisHistory = null;
function renderCurrentAnalysis() {
  const container = document.querySelector('#current-exercise-stats');
  if (currentAnalysisHistory === null) { container.innerHTML = '<p>loading history…</p>'; return; }
  const sets = HistoryAnalysis.records(currentAnalysisHistory, archiveEdits, state.exercises).sets;
  const number = value => Number(value.toFixed(2)).toLocaleString('en-US');
  container.innerHTML = `<ul class="widget-exercise-stats">${state.exercises.map(exercise => {
    const stats = HistoryAnalysis.exerciseSnapshot(sets, exercise.name, new Date().getFullYear(), exercise.id);
    const best = [
      stats.load !== null ? `${number(stats.load)} lb` : '',
      stats.reps !== null ? `${number(stats.reps)} reps` : '',
      stats.duration !== null ? `${number(stats.duration)}s hold` : '',
      stats.repeaters !== null ? `${number(stats.repeaters)}s repeater work` : ''
    ].filter(Boolean).join(' · ');
    const latest = stats.lastDate ? new Date(`${stats.lastDate}T12:00:00`).toLocaleDateString('en-US', {month:'short', day:'numeric'}) : '';
    return `<li><div class="widget-exercise-heading"><a href="analysis.html?exercise=${encodeURIComponent(stats.exercise)}" data-zoom="out">${escape(exercise.name || 'unnamed exercise')}</a><span><span aria-label="${stats.sessionsThisYear} sessions this year">${stats.sessionsThisYear} ${stats.sessionsThisYear === 1 ? 'session' : 'sessions'} this year</span>${latest ? ` · last: <time datetime="${stats.lastDate}" title="Last session: ${escape(formatWorkoutDate(stats.lastDate))}">${escape(latest)}</time>` : ''}</span></div>${stats.sessions ? `<p>best: ${escape(best)}</p>` : '<p>no archived results yet</p>'}</li>`;
  }).join('')}</ul>`;
}
function render() {
  // Normalize every loaded template, including demo resets and account snapshots.
  for (const exercise of state.exercises) {
    if (exercise.barbell === undefined) exercise.barbell = exercise.name.toLowerCase() === 'squat';
    if (exercise.unilateral === undefined) exercise.unilateral = exercise.fields.some(field => /^left/i.test(field));
    if (exercise.superset === undefined) exercise.superset = exercise.tag?.match(/SUPERSET ([A-D])/i)?.[1].toUpperCase() || '';
    if (!exercise.id) exercise.id = crypto.randomUUID();
    if (exercise.notes === undefined) exercise.notes = '';
    if (exercise.weighted === undefined) exercise.weighted = exercise.fields.some(field => /weight/i.test(field));
    if (exercise.measurement === undefined) exercise.measurement = exercise.fields.some(field => /reps × seconds/i.test(field)) ? 'repeaters' : exercise.fields.some(field => /seconds/i.test(field)) ? 'duration' : 'reps';
    if (exercise.measurement === 'repeaters' && exercise.fields.some(field => /reps × seconds/i.test(field))) setMeasurement(exercise, 'repeaters');
  }
  document.querySelector('#date').value = state.date;
  document.querySelector('#date-display').textContent = formatWorkoutDate(state.date);
  document.querySelector('#notes').value = state.notes;
  document.querySelector('#exercises').innerHTML = state.exercises.map((exercise, ei) => `
    <article class="exercise${editingExercises.has(ei) ? ' template-editing' : ''}"><div class="exercise-heading"><button type="button" class="template-edit" data-edit-template="${ei}" aria-label="${editingExercises.has(ei) ? 'Finish editing' : 'Edit'} ${escape(exercise.name)} template" aria-expanded="${editingExercises.has(ei)}" title="${editingExercises.has(ei) ? 'Done editing template' : 'Edit exercise template'}">${editingExercises.has(ei) ? 'done' : pencilIcon}</button><div>${editingExercises.has(ei) || !exercise.name ? `<label class="exercise-name-label" for="exercise-name-${ei}">exercise name</label><input class="exercise-name-input" id="exercise-name-${ei}" data-exercise-name="${ei}" placeholder="Exercise name" maxlength="160" value="${escape(exercise.name)}">` : `<h2>${escape(exercise.name)}</h2>`}<p class="exercise-subtitle">${exercise.barbell ? 'barbell' : exercise.weighted ? 'weighted' : 'bodyweight'}</p>${editingExercises.has(ei) ? `<label for="exercise-notes-${ei}">exercise notes</label><textarea class="exercise-notes-input" id="exercise-notes-${ei}" data-exercise-notes="${ei}" maxlength="2000" placeholder="Setup, cues, rest time…">${escape(exercise.notes)}</textarea>` : exercise.notes ? `<p class="exercise-notes">${escape(exercise.notes)}</p>` : ''}</div>${exercise.superset && !editingExercises.has(ei) ? `<span class="exercise-tag" data-superset-color="${escape(exercise.superset)}" title="superset ${escape(exercise.superset.toLowerCase())}"><svg class="superset-emblem" viewBox="0 0 28 25" role="img" aria-label="superset ${escape(exercise.superset)}"><path d="M3 6 8 2h12l5 4-11 17Z" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"/><text x="14" y="15" text-anchor="middle">S</text></svg></span>` : ''}${editingExercises.has(ei) ? exerciseModifiers(exercise, ei) : ''}</div>
    <div class="sets" style="--result-columns: ${exercise.fields.length}"><div class="set-columns" aria-hidden="true"><span>SET</span>${exercise.fields.map(field => `<span>${escape(field)}</span>`).join('')}</div>${exercise.values.map((set, si) => `<div class="set-row"><span class="set-number">${String(si+1).padStart(2,'0')}</span>${set.map((v, fi) => `<div><label for="value-${ei}-${si}-${fi}">${escape(exercise.fields[fi])}</label><span class="field-entry"><input id="value-${ei}-${si}-${fi}" aria-label="${escape(exercise.name)}, set ${si+1}, ${escape(exercise.fields[fi])}" data-exercise="${ei}" data-set="${si}" data-field="${fi}" type="${String(v).trim() !== '' && !Number.isFinite(Number(v)) ? 'text' : 'number'}" inputmode="decimal" min="0" step="any" value="${escape(v)}">${/weight/i.test(exercise.fields[fi]) ? `<span class="plate-suggestion" data-plate-exercise="${ei}" data-plate-set="${si}" data-plate-field="${fi}" ${exercise.barbell ? '' : 'hidden'}></span>` : ''}</span><span class="previous" title="Previous workout" aria-label="Previous: ${escape(exercise.previous[si][fi])}">was ${escape(exercise.previous[si][fi])}</span></div>`).join('')}</div>`).join('')}</div>
    ${exercise.setup !== undefined && exercise.name.toLowerCase() !== 'squat' ? `<div class="setup"><label for="setup-${ei}">PLATE SETUP</label><input id="setup-${ei}" data-setup="${ei}" value="${escape(exercise.setup)}"></div>` : ''}</article>`).join('');
  renderCurrentAnalysis();
}
document.querySelector('#exercises').addEventListener('click', event => {
  const button = event.target.closest('[data-edit-template]');
  if (!button) return;
  const index = Number(button.dataset.editTemplate);
  if (editingExercises.has(index)) editingExercises.delete(index);
  else editingExercises.add(index);
  render();
  updatePlateSuggestions();
  document.querySelector(`[data-edit-template="${index}"]`).focus();
});
document.querySelector('#exercises').addEventListener('input', event => {
  const input = event.target;
  if (input.dataset.exerciseName !== undefined) {
    state.exercises[input.dataset.exerciseName].name = input.value;
    renderCurrentAnalysis();
  } else if (input.dataset.exerciseNotes !== undefined) {
    state.exercises[input.dataset.exerciseNotes].notes = input.value;
  } else if(input.dataset.setCount !== undefined) {
    const exercise = state.exercises[input.dataset.setCount];
    const count = Number(input.value);
    const removesResults = exercise.values.slice(count).some(row => row.some(value => String(value ?? '').trim() !== ''));
    if (removesResults && !confirm('Remove these sets and their recorded results?')) {
      input.value = String(exercise.values.length);
      return;
    }
    ExerciseFields.setCount(exercise, count);
    render();
  } else if(input.dataset.weighted !== undefined) {
    setWeighted(state.exercises[input.dataset.weighted], input.checked);
    render();
  } else if(input.dataset.measurement !== undefined) {
    setMeasurement(state.exercises[input.dataset.measurement], input.value);
    render();
  } else if(input.dataset.unilateral !== undefined) {
    setLaterality(state.exercises[input.dataset.unilateral], input.checked);
    render();
  } else if(input.dataset.superset !== undefined) {
    state.exercises[input.dataset.superset].superset = input.value;
    render();
  } else if(input.dataset.barbell !== undefined) {
    const exercise = state.exercises[input.dataset.barbell];
    exercise.barbell = input.checked;
    if (input.checked) setWeighted(exercise, true);
    render();
  } else if(input.dataset.exercise !== undefined) state.exercises[input.dataset.exercise].values[input.dataset.set][input.dataset.field] = input.value;
  else if(input.dataset.setup !== undefined) state.exercises[input.dataset.setup].setup = input.value;
  else return;
  updatePlateSuggestions();
  save();
});
document.querySelector('#date').addEventListener('input', e => {state.date=e.target.value; document.querySelector('#date-display').textContent = formatWorkoutDate(state.date); save(); renderLastSessionNotes();});
document.querySelector('#notes').addEventListener('input', e => {state.notes=e.target.value; save();});
render();
const sizes = [45,35,25,10,5,2.5];
document.querySelector('#equipment').innerHTML = sizes.map(size => `<label>${size} lb pairs<input aria-label="Available pairs of ${size} lb plates" data-plate="${size}" type="number" min="0" max="12" step="1" value="${size === 45 ? 2 : 1}"></label>`).join('');
function planPlateSets(values) {
  const barValue = document.querySelector('#bar').value;
  const inventory = sizes.map(size => {
    const value = Number(document.querySelector(`[data-plate="${size}"]`).value);
    return Number.isFinite(value) ? Math.max(0, Math.min(12, Math.floor(value))) : 0;
  });
  return PlatePlanner.plan(values, barValue.trim() === '' ? NaN : Number(barValue), sizes, inventory);
}
function updatePlateSuggestions() {
  state.exercises.forEach((exercise, ei) => {
    const elements = [...document.querySelectorAll(`[data-plate-exercise="${ei}"]`)];
    for (const element of elements) element.hidden = !exercise.barbell;
    if (!exercise.barbell) return;
    const setups = planPlateSets(elements.map(element => exercise.values[element.dataset.plateSet][element.dataset.plateField]));
    elements.forEach((element, i) => {
      const setup = setups[i];
      const value = exercise.values[element.dataset.plateSet][element.dataset.plateField];
      if (String(value ?? '').trim() === '') { element.textContent = ''; element.title = ''; return; }
      if (setup.error) { element.textContent = setup.error; element.title = setup.error; return; }
      const exact = Math.abs(setup.total - setup.target) < .0001;
      element.textContent = `${setup.plates.length ? setup.plates.join(' + ') + ' / side' : 'bar only'}${exact ? '' : ` ≈ ${setup.total} lb total`}`;
      element.title = `${setup.bar} lb bar; ${exact ? 'exact setup' : 'closest available setup, not the entered weight'}. Plates in lb per side, inside to outside. Planned across sets to minimize unloading and plate handling using available equipment.`;
    });
  });
}
function calculate() {
  updatePlateSuggestions();
  const result = document.querySelector('#plate-result');
  const [setup] = planPlateSets([document.querySelector('#target').value]);
  if (setup.error) { result.textContent = setup.error; return; }
  const {total, bar, target, closest, options} = setup;
  const exact = Math.abs(total-target) < .0001;
  const combinations = [...options].sort((a,b) => {
    if (a.length !== b.length) return a.length-b.length;
    for (let i=0; i<a.length; i++) if (a[i] !== b[i]) return b[i]-a[i];
    return 0;
  });
  result.innerHTML = `<span class="muted">${exact ? 'exact setups' : 'closest available setups'} · per side</span>
    <div class="plate-combinations">${combinations.map(plates => `<div class="plates">${plates.length ? plates.join(' + ') : 'bar only'}</div>`).join('')}</div>
    <strong>${total} lb total</strong><br><span class="muted">${bar} lb bar + ${closest/2} lb each side${exact ? '' : `<br>${total>target?'+':''}${Number((total-target).toFixed(2))} lb from target`}</span>`;
}
for(const selector of ['#target','#bar','#equipment']) document.querySelector(selector).addEventListener('input',calculate);
calculate();

let archivedWorkouts = [];
let importedWorkouts = [];
let activeArchiveId = null;
let carouselTransition = null;
function finishCarouselTransition() {
  if (carouselTransition) carouselTransition();
}
function renderArchivePeeks(index, cards) {
  const peeks = document.querySelector('#archive-peeks');
  peeks.innerHTML = Array.from({length: 12}, (_, i) => i < 6 ? i - 6 : 12 - i).map(offset => {
    const card = cards[index+offset];
    if (!card) return '';
    const date = card.querySelector('time');
    const side = offset < 0 ? 'left' : 'right';
    return `<button type="button" class="archive-peek peek-${side}" style="--peek-depth: ${Math.abs(offset)}; --peek-direction: ${offset < 0 ? -1 : 1}" data-peek-index="${index+offset}" aria-label="Show session from ${escape(date.textContent)}" title="${escape(date.textContent)}"><span>${escape(date.textContent)}</span></button>`;
  }).join('');
}
document.querySelector('#archive-peeks').addEventListener('click', event => {
  const button = event.target.closest('[data-peek-index]');
  if (!button) return;
  const index = Number(button.dataset.peekIndex);
  showArchiveCard(index, true);
  document.querySelector('#history-workouts').focus({preventScroll:true});
});
function showArchiveCard(index, animate = false) {
  finishCarouselTransition();
  const cards = [...document.querySelectorAll('#history-workouts > .archive-workout')];
  const position = document.querySelector('#archive-position');
  if (!cards.length) {
    position.textContent = 'no archived sessions';
    document.querySelector('#archive-page').value = '';
    document.querySelector('#archive-page').disabled = true;
    document.querySelector('#archive-total').textContent = '/ 0';
    document.querySelector('#archive-newer').disabled = true;
    document.querySelector('#archive-older').disabled = true;
    activeArchiveId = null;
    document.querySelector('#archive-card-actions').hidden = true;
    document.querySelector('#archive-peeks').replaceChildren();
    return;
  }
  index = Math.max(0, Math.min(cards.length-1, index));
  const viewport = document.querySelector('#history-workouts');
  const previousIndex = cards.findIndex(card => card.id === activeArchiveId);
  const outgoing = cards[previousIndex];
  const incoming = cards[index];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldAnimate = animate && outgoing && outgoing !== incoming && !outgoing.hidden && !reducedMotion && typeof incoming.animate === 'function';
  const oldHeight = shouldAnimate ? viewport.getBoundingClientRect().height : 0;
  cards.forEach((card, i) => { card.hidden = i !== index; });
  activeArchiveId = incoming.id;
  const actions = document.querySelector('#archive-card-actions');
  actions.hidden = false;
  actions.querySelector('[data-delete-archived]').dataset.deleteArchived = incoming.id;
  actions.querySelector('[data-copy-format]').dataset.copyFormat = incoming.id;
  const editButton = actions.querySelector('[data-edit-archive]');
  const editing = incoming.classList.contains('archive-editing');
  editButton.textContent = editing ? 'done' : 'edit';
  editButton.setAttribute('aria-expanded', String(editing));
  editButton.setAttribute('aria-label', `${editing ? 'Finish editing' : 'Edit'} workout from ${incoming.querySelector('time').textContent}`);
  if (shouldAnimate) {
    const newHeight = incoming.getBoundingClientRect().height;
    const direction = index > previousIndex ? 1 : -1;
    outgoing.hidden = false;
    outgoing.classList.add('carousel-outgoing');
    outgoing.setAttribute('aria-hidden', 'true');
    outgoing.inert = true;
    if (outgoing.contains(document.activeElement)) viewport.focus({preventScroll:true});
    viewport.classList.add('carousel-moving');
    viewport.style.height = `${newHeight}px`;
    const timing = {duration:380, easing:'cubic-bezier(.22,.8,.25,1)', fill:'both'};
    const animations = [
      outgoing.animate([
        {transform:'translateX(0) scale(1)', opacity:1},
        {transform:`translateX(${-direction*104}%) scale(.985)`, opacity:.35}
      ], timing),
      incoming.animate([
        {transform:`translateX(${direction*104}%) scale(.985)`, opacity:.35},
        {transform:'translateX(0) scale(1)', opacity:1}
      ], timing),
      viewport.animate([{height:`${oldHeight}px`},{height:`${newHeight}px`}],timing)
    ];
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      animations.forEach(animation => animation.cancel());
      outgoing.hidden = true;
      outgoing.classList.remove('carousel-outgoing');
      outgoing.removeAttribute('aria-hidden');
      outgoing.inert = false;
      viewport.classList.remove('carousel-moving');
      viewport.style.height = '';
      carouselTransition = null;
    };
    carouselTransition = cleanup;
    Promise.all(animations.map(animation => animation.finished)).then(cleanup, cleanup);
  }
  renderArchivePeeks(index, cards);
  position.textContent = `session ${index+1} of ${cards.length}`;
  const pageInput = document.querySelector('#archive-page');
  pageInput.disabled = false;
  pageInput.value = String(index+1);
  document.querySelector('#archive-total').textContent = `/ ${cards.length}`;
  document.querySelector('#archive-newer').disabled = index === 0;
  document.querySelector('#archive-older').disabled = index === cards.length-1;
}
function moveArchiveCard(delta) {
  const cards = [...document.querySelectorAll('#history-workouts > .archive-workout')];
  const current = cards.findIndex(card => card.id === activeArchiveId);
  showArchiveCard(current+delta, true);
}
const archivePageInput = document.querySelector('#archive-page');
function jumpToArchivePage() {
  const cards = [...document.querySelectorAll('#history-workouts > .archive-workout')];
  if (!cards.length) return;
  const value = archivePageInput.value.trim();
  if (!/^\d+$/.test(value)) {
    archivePageInput.value = String(cards.findIndex(card => card.id === activeArchiveId)+1);
    return;
  }
  const page = Math.max(1, Math.min(cards.length, Number(value)));
  showArchiveCard(page-1, true);
}
document.querySelector('#archive-jump').addEventListener('submit', event => {
  event.preventDefault();
  jumpToArchivePage();
});
archivePageInput.addEventListener('blur', jumpToArchivePage);
archivePageInput.addEventListener('focus', () => archivePageInput.select());
let archiveWheelAmount = 0;
let archiveWheelTime = 0;
let archiveWheelNavigation = -Infinity;
document.querySelector('#history').addEventListener('wheel', event => {
  if (!event.shiftKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) return;
  event.preventDefault();
  const now = performance.now();
  if (now-archiveWheelTime > 180 || Math.sign(delta) !== Math.sign(archiveWheelAmount)) archiveWheelAmount = 0;
  archiveWheelTime = now;
  if (now-archiveWheelNavigation < 10) { archiveWheelAmount = 0; return; }
  const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 600 : 1;
  archiveWheelAmount += delta*units;
  if (Math.abs(archiveWheelAmount) >= 25) {
    moveArchiveCard(archiveWheelAmount > 0 ? 1 : -1);
    archiveWheelNavigation = now;
    archiveWheelAmount = 0;
  }
}, {passive:false});
document.querySelector('#archive-newer').addEventListener('click', () => moveArchiveCard(-1));
document.querySelector('#archive-older').addEventListener('click', () => moveArchiveCard(1));
const carousel = document.querySelector('#history-workouts');
carousel.addEventListener('keydown', event => {
  if (event.target.closest('input, textarea, select, button, .archive-scroll')) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    moveArchiveCard(event.key === 'ArrowLeft' ? -1 : 1);
  }
});
let archiveSwipe = null;
carousel.addEventListener('touchstart', event => {
  archiveSwipe = null;
  if (event.touches.length !== 1 || event.target.closest('input, textarea, select, button')) return;
  const scroll = event.target.closest('.archive-scroll');
  // Leave horizontal table scrolling alone when its columns overflow.
  if (scroll && scroll.scrollWidth > scroll.clientWidth+1) return;
  archiveSwipe = {x:event.touches[0].clientX,y:event.touches[0].clientY};
}, {passive:true});
carousel.addEventListener('touchend', event => {
  if (!archiveSwipe || !event.changedTouches.length) return;
  const dx=event.changedTouches[0].clientX-archiveSwipe.x;
  const dy=event.changedTouches[0].clientY-archiveSwipe.y;
  archiveSwipe=null;
  if (Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)*1.5) moveArchiveCard(dx<0 ? 1 : -1);
}, {passive:true});
carousel.addEventListener('touchcancel', () => {archiveSwipe=null;}, {passive:true});
function renderLastSessionNotes() {
  renderCurrentAnalysis();
  const container = document.querySelector('#last-session-notes');
  const dateLabel = document.querySelector('#last-session-date');
  const previous = archivedWorkouts.find(workout => workout.date < state.date || (workout.local && workout.date === state.date));
  if (!previous) {
    dateLabel.textContent = '';
    container.textContent = '';
    return;
  }
  dateLabel.textContent = formatWorkoutDate(previous.date);
  const cellValue = (row, ri, ci) => {
    const key = `${previous.id}:${ri}:${ci}`;
    return String(Object.hasOwn(archiveEdits, key) ? archiveEdits[key] : row[ci] || '').trim();
  };
  const notes = [];
  const headerLabels = /^(weight(?:\s+(?:lbs?|kg))?|l|r|left|right|l\s*\/\s*b|notes?)$/i;
  (previous.local ? [] : previous.heading.slice(1)).forEach(value => {
    if (value.trim() && !headerLabels.test(value.trim())) notes.push({text:value,context:''});
  });
  let resultColumns = new Set();
  let context = '';
  previous.rows.forEach((row, ri) => {
    // Some old layouts put a left-side result in column five, not a note.
    if (row.some(value => /^weight (?:lbs?|kg)$/i.test(value.trim()))) {
      resultColumns = new Set(row.map((value, i) => /^(left|right|l|r)$/i.test(value.trim()) ? i : -1));
      return;
    }
    if (cellValue(row, ri, 0)) context = cellValue(row, ri, 0);
    for (let ci=4; ci<row.length; ci++) {
      const text = cellValue(row, ri, ci);
      if (text && !resultColumns.has(ci) && !/^notes?$/i.test(text)) notes.push({text,context});
    }
  });
  container.innerHTML = notes.length ? ` — ${notes.map(note => `${note.context ? `<span class="inline-note-context">${escape(note.context)}:</span> ` : ''}${escape(note.text)}`).join('; ')}` : '';
}
const archiveEditKey = 'training-archive-cell-edits-v1';
let archiveEdits = {};
// Account archive edits are supplied only after authentication.
document.querySelector('#archive-card-actions').addEventListener('click', event => {
  const button = event.target.closest('[data-edit-archive]');
  if (!button) return;
  const article = document.getElementById(activeArchiveId);
  if (!article) return;
  const editing = article.classList.toggle('archive-editing');
  button.textContent = editing ? 'done' : 'edit';
  button.setAttribute('aria-expanded', String(editing));
  button.setAttribute('aria-label', `${editing ? 'Finish editing' : 'Edit'} workout from ${article.querySelector('time').textContent}`);
  const time = article.querySelector('time');
  if (editing) {
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = time.dateTime;
    dateInput.dataset.archiveDate = article.id;
    dateInput.setAttribute('aria-label', 'Archived workout date');
    time.hidden = true;
    time.after(dateInput);
  }
  for (const cell of article.querySelectorAll('[data-archive-cell]')) {
    if (editing) {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = cell.textContent;
      input.setAttribute('aria-label', `${cell.dataset.columnLabel}, source row ${Number(cell.dataset.sourceRow) + 1}`);
      cell.replaceChildren(input);
    } else {
      cell.textContent = cell.querySelector('input').value;
    }
  }
  if (!editing) renderHistory();
});
document.querySelector('#history-workouts').addEventListener('change', event => {
  const input = event.target;
  if (input.dataset.archiveDate === undefined || !input.value || !input.validity.valid) return;
  const entry = archivedWorkouts.find(workout => workout.id === input.dataset.archiveDate);
  if (!entry) return;
  const oldDate = entry.date;
  entry.date = input.value;
  try {
    storeWorkingCopy();
    localStorage.setItem('training-cloud-history-v1', JSON.stringify(importedWorkouts));
  } catch {
    entry.date = oldDate;
    input.value = oldDate;
    document.querySelector('#history-status').textContent = 'could not save the date. please try again.';
    return;
  }
  const article = input.closest('.archive-workout');
  const time = article.querySelector('time');
  time.dateTime = entry.date;
  time.textContent = formatWorkoutDate(entry.date);
  article.setAttribute('aria-label', `Session from ${formatWorkoutDate(entry.date)}`);
  renderLastSessionNotes();
  renderCurrentAnalysis();
  document.querySelector('#history-status').textContent = 'archive date saved locally';
  notifyCloud();
});
document.querySelector('#history-workouts').addEventListener('input', event => {
  const cell = event.target.closest('[data-archive-cell]');
  if (!cell || event.target.tagName !== 'INPUT') return;
  archiveEdits[cell.dataset.archiveCell] = event.target.value;
  renderLastSessionNotes();
  const status = document.querySelector('#history-status');
  try {
    localStorage.setItem(archiveEditKey, JSON.stringify(archiveEdits));
    status.textContent = viewScope === 'demo' ? 'demo archive edited' : 'archive edits saved locally · syncing';
  } catch {
    status.textContent = 'unable to save archive edits locally — keep this tab open';
  }
  notifyCloud();
});
function renderHistory() {
    finishCarouselTransition();
    const status = document.querySelector('#history-status');
    const workouts = [...(state.archivedSessions || []), ...importedWorkouts]
      .filter(workout => !(state.removedArchiveIds || []).includes(workout.id))
      .sort((a,b) => b.date.localeCompare(a.date));
    archivedWorkouts = workouts;
    currentAnalysisHistory = workouts;
    renderLastSessionNotes();
    const counts = new Map();
    const seen = new Map();
    for (const workout of workouts) counts.set(workout.date, (counts.get(workout.date) || 0) + 1);
    document.querySelector('#history-workouts').innerHTML = workouts.map(workout => {
      seen.set(workout.date, (seen.get(workout.date) || 0) + 1);
      const duplicate = counts.get(workout.date) > 1;
      const width = Math.max(workout.heading.length, ...workout.rows.map(row => row.length));
      // Keep every source column that contains data, even notes or video links.
      const columns = Array.from({length: width}, (_, i) => i).filter(i =>
        i === 0 || workout.heading[i]?.trim() || workout.rows.some(row => row[i]?.trim()));
      const columnLabel = i => {
        if (i === 0) return 'exercise';
        if (i === 1) return 'weight / setup';
        if (i === 2) return /^(l|left)/i.test(workout.heading[2] || '') ? 'left / both' : /^(r|right)/i.test(workout.heading[2] || '') ? 'right / both' : 'result';
        if (i === 3) return /^(l|left)/i.test(workout.heading[3] || '') ? 'left' : /^(r|right)/i.test(workout.heading[3] || '') ? 'right' : 'result 2';
        return i === 4 ? 'notes' : 'reference';
      };
      const header = `<th class="archive-title-column" scope="col">exercise</th><th class="archive-set-number" scope="col">set</th>${columns.filter(i => i !== 0).map(i => `<th scope="col">${escape(columnLabel(i))}</th>`).join('')}`;
      const groups = [];
      workout.rows.forEach((row, ri) => {
        if (!row.some(cell => cell.trim())) return;
        if (row[0]?.trim() || !groups.length) groups.push([]);
        groups[groups.length-1].push({row,ri});
      });
      const cell = (row, ri, ci, attributes = '') => {
        const cellKey = `${workout.id}:${ri}:${ci}`;
        const value = Object.hasOwn(archiveEdits, cellKey) ? archiveEdits[cellKey] : row[ci] || '';
        return `<td ${attributes} data-archive-cell="${escape(cellKey)}" data-source-row="${ri}" data-column-label="${escape(columnLabel(ci))}">${escape(value)}</td>`;
      };
      const rows = groups.map(group => `<tbody class="archive-exercise">${group.map(({row,ri}, si) => `<tr>${si === 0 ? cell(row,ri,0,`class="archive-exercise-title" rowspan="${group.length}"`) : ''}<td class="archive-set-number">${String(si+1).padStart(2,'0')}</td>${columns.filter(i => i !== 0).map(i => cell(row,ri,i)).join('')}</tr>`).join('')}</tbody>`).join('');
      return `<article class="archive-workout" id="${escape(workout.id)}" role="group" aria-roledescription="slide" aria-label="Session from ${escape(formatWorkoutDate(workout.date))}">
        <div class="archive-heading"><h3><time datetime="${escape(workout.date)}">${escape(formatWorkoutDate(workout.date))}</time></h3>${duplicate || workout.inferredYear ? `<span class="archive-detail">${duplicate ? `entry ${seen.get(workout.date)} of ${counts.get(workout.date)}` : ''}${duplicate && workout.inferredYear ? ' · ' : ''}${workout.inferredYear ? 'year inferred: 2024' : ''}</span>` : ''}</div>
        <div class="archive-scroll" tabindex="0" role="region" aria-label="Workout from ${escape(workout.label)}"><table><thead><tr>${header}</tr></thead>${rows}</table></div>
      </article>`;
    }).join('');
    const activeIndex = workouts.findIndex(workout => workout.id === activeArchiveId);
    showArchiveCard(activeIndex < 0 ? 0 : activeIndex);
    status.textContent = workouts.length ? `${workouts.length} workouts · newest first${viewScope === 'demo' ? ' · demo archive' : ''}` : 'no archived workouts yet';
}
document.querySelector('#archive-card-actions').addEventListener('click', event => {
  const button = event.target.closest('[data-delete-archived], [data-copy-format]');
  if (!button) return;
  const deleting = button.dataset.deleteArchived !== undefined;
  const entry = archivedWorkouts.find(workout => workout.id === (deleting ? button.dataset.deleteArchived : button.dataset.copyFormat));
  if (!entry) return;
  const message = deleting
    ? `Delete the archived workout from ${formatWorkoutDate(entry.date)}?`
    : `Copy the format from ${formatWorkoutDate(entry.date)} to the current workout? This replaces the current exercises and results with blank sets. The archive, current date, and session notes will be kept.`;
  if (!confirm(message)) return;
  const status = document.querySelector('#archive-action-status');
  let next;
  try {
    next = deleting ? {
      ...state,
      archivedSessions: (state.archivedSessions || []).filter(workout => workout.id !== entry.id),
      removedArchiveIds: [...new Set([...(state.removedArchiveIds || []), entry.id])]
    } : SessionArchive.copyFormat(state, entry, archiveEdits);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    status.textContent = 'could not save the change. your workout and archive have not been changed.';
    return;
  }
  archiveFeedback.clear();
  state = next;
  editingExercises.clear();
  render();
  updatePlateSuggestions();
  renderHistory();
  save();
  status.textContent = deleting ? 'archived workout deleted' : 'workout format copied';
  document.querySelector(deleting ? '#archive-newer' : '#push-archive').focus();
});
async function loadHistory() {
  try {
    const response = await fetch('data/history.json');
    if (!response.ok) throw new Error(`History request failed: ${response.status}`);
    const {workouts} = await response.json();
    demoHistory = workouts;
    if (viewScope === 'demo') { importedWorkouts = workouts; renderHistory(); }
  } catch (error) {
    if (viewScope === 'demo') {
      renderHistory();
      document.querySelector('#history-status').textContent = 'could not load demo history. refresh to try again.';
    }
    console.error(error);
  } finally {
    window.WorkoutCloudBridge.ready = true;
    window.dispatchEvent(new Event('workout-history-ready'));
  }
}
const pushArchive = document.querySelector('#push-archive');
const archiveConfirm = document.querySelector('#archive-confirm');
function showArchiveConfirmation(show) {
  pushArchive.hidden = show;
  pushArchive.setAttribute('aria-expanded', String(show));
  archiveConfirm.hidden = !show;
  document.querySelector(show ? '#archive-no' : '#push-archive').focus();
}
pushArchive.addEventListener('click', () => {
  archiveFeedback.clear();
  showArchiveConfirmation(true);
});
document.querySelector('#archive-no').addEventListener('click', () => showArchiveConfirmation(false));
archiveConfirm.addEventListener('keydown', event => {
  if (event.key === 'Escape') showArchiveConfirmation(false);
});
document.querySelector('#archive-yes').addEventListener('click', () => {
  const status = document.querySelector('#archive-action-status');
  const previousState = JSON.parse(JSON.stringify(state));
  const previousArchiveId = activeArchiveId;
  let next;
  try {
    ({next} = SessionArchive.prepare(state, today(), `local-${crypto.randomUUID()}`));
  } catch (error) { status.textContent = error.message; return; }
  try {
    // One storage write commits both the archive entry and reset session.
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    status.textContent = 'could not save. your current workout has not been cleared.';
    return;
  }
  const motionSnapshot = ArchiveMotion.capture(document.querySelector('#exercises'));
  state = next;
  notifyCloud();
  activeArchiveId = state.archivedSessions[0].id;
  editingExercises.clear();
  render();
  updatePlateSuggestions();
  renderHistory();
  showArchiveConfirmation(false);
  showArchiveUndo('session archived', previousState, previousArchiveId);
  ArchiveMotion.play('push', motionSnapshot);
});
let demoHistory = [];
window.WorkoutCloudBridge = {
  ready: true,
  blank() { return {state:blankSession(), archiveEdits:{}, importedWorkouts:[]}; },
  lock(locked) {
    if (locked) archiveFeedback.clear();
    document.querySelector('#workout-content').disabled = locked;
    document.querySelector('#date').disabled = locked;
  },
  demo() {
    this.apply({state:sample(), archiveEdits:{}, importedWorkouts:demoHistory}, 'demo');
    this.lock(false);
  },
  snapshot() {
    return JSON.parse(JSON.stringify({state, archiveEdits, importedWorkouts}));
  },
  apply(snapshot, scope = viewScope) {
    if (!Array.isArray(snapshot?.state?.exercises) || !snapshot.state.exercises.length ||
        !snapshot.state.exercises.every(e => Array.isArray(e.values) && Array.isArray(e.fields) && Array.isArray(e.previous)) ||
        !Array.isArray(snapshot.importedWorkouts) || !snapshot.archiveEdits) {
      throw new Error('Invalid cloud workout data. Local data has not been replaced.');
    }
    archiveFeedback.clear();
    viewScope = scope;
    state = snapshot.state;
    archiveEdits = snapshot.archiveEdits;
    importedWorkouts = snapshot.importedWorkouts;
    try {
      storeWorkingCopy();
      localStorage.setItem(archiveEditKey, JSON.stringify(archiveEdits));
      localStorage.setItem('training-cloud-history-v1', JSON.stringify(importedWorkouts));
    } catch (error) { console.warn('Working-view cache unavailable', error); }
    editingExercises.clear();
    render();
    updatePlateSuggestions();
    renderHistory();
  }
};
renderHistory();
loadHistory();
