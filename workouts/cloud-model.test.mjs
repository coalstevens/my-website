import test from 'node:test';
import assert from 'node:assert/strict';
import {encode, decode, changes, identifyExercises} from './cloud-model.mjs';
const history = {id:'old', date:'2026-01-01', heading:['exercise','weight'], rows:[['squat','100']]};
const local = {...history, id:'local-one', local:true};
const snapshot = () => ({state:{date:'2026-02-01', exercises:[{fields:['Reps'],values:[[5]],previous:[[4]]}], archivedSessions:[local]}, archiveEdits:{'old:0:1':'105'}, importedWorkouts:[history]});
test('nested workout arrays round-trip through Firestore-safe strings', () => {
  const input = snapshot();
  const packed = encode(input);
  assert.equal(typeof packed.draft, 'string');
  assert.equal(typeof packed.workouts.get('old'), 'string');
  assert.deepEqual(decode(packed.draft, packed.workouts), input);
  assert.equal(input.state.archivedSessions.length, 1);
});
test('only changed workout documents are written', () => {
  const first = encode(snapshot());
  const input = snapshot();
  input.state.exercises[0].values[0][0] = 6;
  assert.deepEqual(changes(first.workouts, encode(input).workouts), {writes:[], deletes:[]});
  input.state.archivedSessions[0] = {...local, date:'2026-02-02'};
  assert.deepEqual(changes(first.workouts, encode(input).workouts).writes.map(([id])=>id), ['local-one']);
});
test('restoring from archive removes the cloud archive document', () => {
  const input = snapshot();
  const first = encode(input);
  input.state.removedArchiveIds = ['old'];
  const next = encode(input);
  assert.deepEqual(changes(first.workouts, next.workouts).deletes, ['old']);
  assert.equal(decode(next.draft, next.workouts).importedWorkouts.length, 0);
});
test('legacy template IDs are linked before future renames without changing source titles', () => {
  const input = snapshot();
  input.state.exercises[0].name = 'Hang';
  input.state.archivedSessions[0] = {...local, exercises:[{name:'hang', values:[[10]]}]};
  const linked = identifyExercises(input, ()=>'generated-id');
  assert.equal(linked.state.exercises[0].id, linked.state.archivedSessions[0].exercises[0].id);
  assert.equal(input.state.exercises[0].id, undefined);
  assert.equal(linked.state.archivedSessions[0].exercises[0].name, 'hang');
});
test('invalid document IDs are rejected', () => {
  const input = snapshot();
  input.importedWorkouts = [{...history, id:'bad/id'}];
  assert.throws(()=>encode(input), /Invalid workout ID/);
});
