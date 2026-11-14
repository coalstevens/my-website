import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {encode,decode} from './cloud-model.mjs';
const code=fs.readFileSync(new URL('./firebase-analysis.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const empty=()=>({state:{exercises:[],archivedSessions:[]},archiveEdits:{},importedWorkouts:[]});
async function harness(){
  let authCallback,state,message,fail=false,watcher,reads=0;
  const caches=new Map();
  const privateSnapshot={...empty(),importedWorkouts:[{id:'private',date:'2026-01-01',heading:[],rows:[]}]};
  const packed=encode(privateSnapshot);
  await vm.runInNewContext(`(async()=>{${code}\n})()`,{
    window:{WorkoutAnalysisBridge:{apply(value,text){state=value;message=text;},message(text){message=text;}},addEventListener(){}},
    onAuthStateChanged:(_auth,callback)=>{authCallback=callback;},auth:{},
    cacheKey:uid=>uid,readAccountCache:uid=>caches.get(uid)||null,
    metadata:uid=>uid,onSnapshot:(_ref,callback)=>{watcher=callback;return ()=>{};},
    readCloud:async()=>{reads++;if(fail)throw new Error('Offline');return {exists:true,revision:1,draft:packed.draft,workouts:packed.workouts};},
    fetch:async()=>({ok:true,json:async()=>({workouts:[{id:'public',date:'2025-01-01',rows:[]}]})}),decode
  });
  return {login:uid=>authCallback(uid?{uid}:null),caches,offline(){fail=true;},get state(){return state;},get message(){return message;},get listener(){return watcher;},get reads(){return reads;}};
}
test('analysis switches between public demo and authenticated archive',async()=>{
  const h=await harness();await h.login(null);assert.equal(h.state.importedWorkouts[0].id,'public');
  await h.login('alice');assert.equal(h.state.importedWorkouts[0].id,'private');
  await h.login(null);assert.equal(h.state.importedWorkouts[0].id,'public');
});
test('a stale analysis listener cannot refresh a different account',async()=>{
  const h=await harness();await h.login('alice');
  const staleListener=h.listener;
  await h.login('bob');
  const reads=h.reads;
  staleListener({metadata:{fromCache:false}});
  assert.equal(h.reads,reads);
});
test('analysis never falls back to demo or another account after private load failure',async()=>{
  const h=await harness();
  h.caches.set('alice',{snapshot:{...empty(),importedWorkouts:[{id:'alice-cache',date:'2026-01-01',rows:[]}]},dirty:true});
  h.offline();await h.login('alice');assert.equal(h.state.importedWorkouts[0].id,'alice-cache');
  await h.login('bob');assert.equal(h.state.importedWorkouts.length,0);assert.match(h.message,/Account history could not load/);
});
