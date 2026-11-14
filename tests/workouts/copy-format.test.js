const test = require('node:test');
const assert = require('node:assert/strict');
const {copyFormat} = require('../../workouts/js/session-archive.js');

test('copy format keeps current metadata and archive, blanks results, and honors archive edits', () => {
  const entry = {id:'old',local:true,date:'2025-01-01',heading:['exercise','weight','result'],rows:[['Squat','100','5','','Cue']],exercises:[{id:'ex',name:'Squat',fields:['Weight · lb','Reps'],values:[[100,5]],previous:[[90,5]],barbell:true,measurementBackup:{values:[[]],previous:[[]]}}]};
  const current = {date:'2026-01-01',notes:'Keep notes',exercises:[],archivedSessions:[entry],removedArchiveIds:[]};
  const before = JSON.stringify(current);
  const next = copyFormat(current,entry,{'old:0:0':'Front squat'});
  assert.equal(next.date,current.date);
  assert.equal(next.notes,current.notes);
  assert.deepEqual(next.archivedSessions,[entry]);
  assert.deepEqual(next.removedArchiveIds,[]);
  assert.equal(next.exercises[0].name,'Front squat');
  assert.deepEqual(next.exercises[0].values,[['','']]);
  assert.deepEqual(next.exercises[0].previous,[['100','5']]);
  assert.equal(next.exercises[0].barbell,true);
  assert.equal(next.exercises[0].measurementBackup,undefined);
  assert.equal(JSON.stringify(current),before);
});
