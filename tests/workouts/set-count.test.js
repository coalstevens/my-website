const test = require('node:test');
const assert = require('node:assert/strict');
const {setCount} = require('../../workouts/js/exercise-fields.js');

test('set count preserves existing rows and adds independent blank rows', () => {
  const exercise = {fields:['Weight','Reps'],values:[[100,5]],previous:[[95,5]]};
  setCount(exercise,3);
  assert.deepEqual(exercise.values,[[100,5],['',''],['','']]);
  assert.deepEqual(exercise.previous,[[95,5],['',''],['','']]);
  exercise.values[1][0] = 50;
  assert.equal(exercise.values[2][0],'');
  assert.equal(exercise.previous[1][0],'');
});

test('removing sets trims modifier backups and validates limits', () => {
  const exercise = {fields:['Reps'],values:[[5],[6]],previous:[[4],[5]],weightBackup:{values:[10,20],previous:[5,15]},measurementBackup:{values:[[],[]],previous:[[],[]]},resultRightBackup:{values:[{},{}],previous:[{},{}]}};
  setCount(exercise,1);
  assert.deepEqual(exercise.values,[[5]]);
  for (const key of ['weightBackup','measurementBackup','resultRightBackup']) {
    assert.equal(exercise[key].values.length,1);
    assert.equal(exercise[key].previous.length,1);
  }
  for (const count of [0,-1,1.5,21,NaN]) setCount(exercise,count);
  assert.equal(exercise.values.length,1);
});
