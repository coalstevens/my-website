const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('./history-analysis.js');
const S=require('./session-archive.js');
const exercise=()=>({id:'stable-id',name:'Hang',notes:'Rest 2 minutes\nRelax shoulders',fields:['Hold · seconds'],measurement:'duration',values:[[10],[12]],previous:[[''],['']]});
test('exercise names, IDs and notes survive archive, next session and restore',()=>{
  const current={date:'2026-01-01',notes:'Session note',exercises:[exercise()]};
  const {entry,next}=S.prepare(current,'2026-01-02','workout-1');
  assert.equal(entry.rows[0][4],current.exercises[0].notes);
  assert.equal(next.exercises[0].id,'stable-id');
  assert.equal(next.exercises[0].notes,current.exercises[0].notes);
  assert.equal(next.exercises[0].values[0][0],'');
  next.exercises[0].name='Renamed hang';next.exercises[0].notes='Changed instruction';
  assert.equal(entry.exercises[0].name,'Hang');
  const restored=S.restore(next,entry,{'workout-1:0:4':'Updated archive cue'});
  assert.equal(restored.exercises[0].notes,'Updated archive cue');
  assert.equal(restored.exercises[0].id,'stable-id');
});
test('renaming a template retains analysis history through its stable ID',()=>{
  const {entry}=S.prepare({date:'2026-01-01',notes:'',exercises:[exercise()]},'2026-01-02','one');
  const renamed={...exercise(),name:'Renamed hang'};
  const sets=A.records([entry],{},[renamed]).sets;
  assert.equal(sets.length,2);
  assert.equal(sets[0].exercise,'renamed hang');
  assert.equal(sets[0].exerciseId,'stable-id');
  assert.equal(A.exerciseSnapshot(sets,renamed.name,2026,renamed.id).sessions,1);
  assert.equal(entry.rows[0][0],'Hang');
});
test('recorded exercises require names before archiving',()=>{
  assert.throws(()=>S.prepare({date:'2026-01-01',exercises:[{...exercise(),name:''}]},'2026-01-02','one'),/name each exercise/);
});
