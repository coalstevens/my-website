const assert = require('node:assert/strict');
const {plan,transition} = require('../../workouts/js/plate-planner.js');
const sizes=[45,25,10,5], inventory=[1,1,2,1];
const ascending=plan([95,135,145],45,sizes,inventory);
assert.deepEqual(ascending.map(s=>s.plates),[[25],[25,10,10],[25,10,10,5]]);
assert.deepEqual(plan([135],45,sizes,inventory)[0].plates,[45]);
assert.deepEqual(plan([135],45,sizes,inventory)[0].options.map(p=>p.join('+')).sort(),['25+10+10','45']);
assert.equal(new Set(plan([145],45,sizes,inventory)[0].options.map(p=>p.join('+'))).size, plan([145],45,sizes,inventory)[0].options.length);
assert.deepEqual(plan([145,135,95],45,sizes,inventory).map(s=>s.plates),[[45,5],[45],[25]]);
assert.deepEqual(transition([25,10],[45,10]),[2,4]);
assert.equal(plan([176],45,[45,35,25,10,5,2.5],[2,1,1,1,1,1])[0].total,175);
assert.deepEqual(plan([45],45,sizes,inventory)[0].plates,[]);
assert(plan([''],45,sizes,inventory)[0].error);
assert(plan([20],45,sizes,inventory)[0].error);
assert(plan([95],NaN,sizes,inventory)[0].error);
assert.equal(plan([95,'',135],45,sizes,inventory)[2].total,135);
for(const weights of [[95,135,145],[145,135,95],[105,175,195],[95,95,95]]) {
  const results=plan(weights,45,sizes,inventory);
  results.forEach((result,i)=>{
    assert.equal(result.total,45+2*result.plates.reduce((a,b)=>a+b,0));
    sizes.forEach((size,j)=>assert(result.plates.filter(p=>p===size).length<=inventory[j]));
    assert.deepEqual(result.plates,[...result.plates].sort((a,b)=>b-a));
  });
}
console.log('PASS: sequence planning, descending sets, physical unloading, inventory limits, nearest weights, and invalid inputs');
