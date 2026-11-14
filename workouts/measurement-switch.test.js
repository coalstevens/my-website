const test = require('node:test');
const assert = require('node:assert/strict');
const {setMeasurement} = require('./exercise-fields.js');

test('duration/reps switches retain current and previous values on both sides', () => {
  const exercise = {fields:['Weight · lb','Left · duration · seconds','Right · duration · seconds'],measurement:'duration',unilateral:true,values:[[25,30,40],[30,0,'']],previous:[[20,25,35],[25,10,15]]};
  const original = JSON.parse(JSON.stringify(exercise));
  setMeasurement(exercise,'reps');
  assert.deepEqual(exercise.values,original.values);
  assert.deepEqual(exercise.previous,original.previous);
  assert.deepEqual(exercise.fields,['Weight · lb','Left · reps','Right · reps']);
  exercise.values[0][1] = 12;
  setMeasurement(exercise,'duration');
  assert.equal(exercise.values[0][1],12);
  assert.deepEqual(exercise.previous,original.previous);
  setMeasurement(exercise,'reps');
  assert.equal(exercise.values[0][1],12);
});
