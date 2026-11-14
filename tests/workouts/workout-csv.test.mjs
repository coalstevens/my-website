import test from 'node:test';
import assert from 'node:assert/strict';
import {csvCell, workoutCSV} from '../../workouts/js/workout-csv.mjs';
test('CSV quotes text and neutralizes spreadsheet formulas',()=>{
  assert.equal(csvCell('a,"b"\nc'),'"a,""b""\nc"');
  for(const text of ['=HYPERLINK("x")',' +SUM(1,2)','@command','-1','\tcommand']) assert.ok(csvCell(text).startsWith('"\''));
  assert.equal(csvCell('ordinary notes'),'"ordinary notes"');
});
test('CSV includes draft, exercise notes, session notes, edited archive cells, and stable IDs',()=>{
  const exercise={id:'ex1',name:'Hang',notes:'Relax shoulders\nRest 2 min',fields:['Left · seconds','Right · seconds'],unilateral:true,values:[[10,12]]};
  const snapshot={state:{date:'2026-01-02',notes:'Session note',exercises:[exercise]},archiveEdits:{'w1:0:2':'15s'},importedWorkouts:[{id:'w1',date:'2026-01-01',heading:['exercise','weight','left','right','notes'],rows:[['Hang','','10s','12s','Relax shoulders']],exercises:[exercise]}]};
  const csv=workoutCSV(snapshot);
  for(const value of ['"ex1"','"draft"','"archived"','"15s"','"10s"','"12s"','"Session note"','"Relax shoulders\nRest 2 min"']) assert.ok(csv.includes(value),value);
  snapshot.state.removedArchiveIds=['w1'];
  assert.ok(!workoutCSV(snapshot).includes('"archived"'));
});
test('CSV preserves repeater results and ambiguous legacy source columns',()=>{
  const snapshot={state:{date:'2026-01-02',exercises:[{id:'r',name:'Repeaters',fields:['Reps','Hold · seconds'],measurement:'repeaters',values:[[6,7]]}]},archiveEdits:{},importedWorkouts:[{id:'old',date:'2025-01-01',heading:['exercise','weight','result'],rows:[['Hang','bodyweight','unclear','','note','video link']]}]};
  const csv=workoutCSV(snapshot);
  for(const value of ['6 × 7s','unclear','video link','bodyweight']) assert.ok(csv.includes(value));
});
