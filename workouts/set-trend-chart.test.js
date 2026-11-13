const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const A=require('./history-analysis.js');
const context={HistoryAnalysis:A};vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'set-trend-chart.js'),'utf8')+'\nthis.chart=SetTrendChart;',context);
const sets=A.records([
 {id:'a',date:'2026-01-01',rows:[['press','20','8','7'],['','25','6','5'],['','','4','']]},
 {id:'b',date:'2026-01-01',rows:[['press','30','5',''],['','35','3','']]}
]).sets;
const points=A.setTrend(sets,'press');
assert.equal(points.length,5);
assert.deepEqual(points.map(point=>point.setNumber),[1,2,3,1,2]);
assert.deepEqual(points.map(point=>point.sessionIndex),[0,0,0,1,1]);
assert.deepEqual(points[0].reps,[{value:8,side:0},{value:7,side:1}]);
assert.deepEqual(points[2].load,[]);
const dual=context.chart.build(sets,'press','auto');
assert.equal((dual.markup.match(/<circle /g)||[]).length,11); // seven side-specific reps + four loads
assert(dual.summary.includes('5 sets across 2 sessions'));
assert(dual.markup.includes('session 1 · set 2 · right'));
assert(dual.markup.includes('session 2 · set 1'));
assert(dual.markup.includes('data-point-value="25 lb"'));
assert(dual.markup.includes('data-point-value="8 reps"'));
assert(dual.markup.includes('tabindex="0"'));
assert(!dual.markup.includes('NaN'));
assert(!dual.summary.includes('best'));
const reps=context.chart.build(sets,'press','reps');
assert.equal((reps.markup.match(/<circle /g)||[]).length,7);
assert(context.chart.build(sets,'missing','auto').markup.includes('no clear results'));
console.log('PASS: every set plotted, paired reps/load, separate sides, missing loads, discrete same-day sessions, and empty state');
