import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {encode, decode, changes, identifyExercises} from '../../workouts/js/cloud-model.mjs';
const code = fs.readFileSync(new URL('../../workouts/js/firebase-sync.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '');
const clone = value => JSON.parse(JSON.stringify(value));
const blank = () => ({state:{date:'2026-07-01',notes:'',exercises:Array.from({length:4},(_,i)=>({id:`ex-${i}`,name:'',notes:'',fields:['Reps'],values:[[''],[''],['']],previous:[[''],[''],['']]})),archivedSessions:[]},archiveEdits:{},importedWorkouts:[]});
const demo = () => ({...blank(), importedWorkouts:[{id:'public',date:'2025-01-01',heading:[],rows:[['Demo','','5','']]}]});
async function harness({storage=new Map(), remote={exists:false,revision:0,workouts:new Map()}, offline=false}={}) {
  let state = demo(), authCallback, watcher, watcherError, locked=false;
  const events = new Map(), timers = new Map(), elements = new Map();
  let timerId=0, writes=0;
  const element = id => {
    if (!elements.has(id)) elements.set(id, {hidden:false, disabled:false, textContent:'', handlers:{}, addEventListener(name,callback){this.handlers[name]=callback;}});
    return elements.get(id);
  };
  const bridge = {ready:true, blank, demo(){state=demo();locked=false;}, lock(value){locked=value;}, snapshot(){return clone(state);}, apply(value){state=clone(value);}};
  const context = {
    window:{WorkoutCloudBridge:bridge,addEventListener:(name,cb)=>events.set(name,cb)},
    document:{getElementById:element}, navigator:{onLine:!offline},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    console:{error(){},warn(){}}, confirm:()=>true,
    setTimeout:callback=>{const id=++timerId;timers.set(id,callback);return id;},clearTimeout:id=>timers.delete(id),
    GoogleAuthProvider:class {},signInWithPopup:async()=>{},signOut:async()=>authCallback(null),
    onAuthStateChanged:(_auth,cb)=>{authCallback=cb;}, auth:{},db:{},
    cacheKey:uid=>`account:${uid}`,pendingKey:uid=>`pending:${uid}`,
    readAccountCache:uid=>JSON.parse(storage.get(`pending:${uid}`)||storage.get(`account:${uid}`)||'null'),
    metadata:uid=>`meta:${uid}`,workoutRef:(uid,id)=>`${uid}:${id}`,serverTimestamp:()=>123,
    readCloud:async()=>{if(offline)throw new Error('Offline');return {...remote,workouts:new Map(remote.workouts)};},
    onSnapshot:(_ref,_options,callback,onError)=>{watcher=callback;watcherError=onError;return ()=>{};},
    runTransaction:async(_db,callback)=>{
      if(offline)throw new Error('Offline');
      const operations=[];
      await callback({get:async()=>({data:()=>remote.exists?{revision:remote.revision}:undefined}),set:(ref,data)=>operations.push(['set',ref,data]),delete:ref=>operations.push(['delete',ref])});
      for(const [operation,ref,data] of operations){
        if(ref.startsWith('meta:')){remote.exists=true;remote.revision=data.revision;remote.draft=data.data;}
        else if(operation==='delete')remote.workouts.delete(ref.split(':')[1]);
        else remote.workouts.set(ref.split(':')[1],data.data);
      }
      writes++;
    }, encode,decode,changes,identifyExercises,downloadCSV:()=>{}
  };
  await vm.runInNewContext(`(async()=>{${code}\n})()`,context);
  return {
    login:uid=>authCallback(uid?{uid,email:`${uid}@example.com`}:null),
    async flush(){for(let i=0;timers.size && i<10;i++){const pending=[...timers.values()];timers.clear();for(const callback of pending)await callback();}},
    async live(){watcher({data:()=>({revision:remote.revision}),metadata:{fromCache:false,hasPendingWrites:false}});await new Promise(resolve=>setImmediate(resolve));},
    edit(value){state.state.exercises[0].name=value;events.get('workout-local-change')();},
    click:id=>element(id).handlers.click(),
    get listenerError(){return watcherError;},
    get state(){return state;},get locked(){return locked;},get writes(){return writes;},element,storage,remote,
    online(){offline=false;context.navigator.onLine=true;},
    offline(){offline=true;context.navigator.onLine=false;}
  };
}
test('new account gets four blank exercises, never demo archive; edits save automatically',async()=>{
  const h=await harness();
  h.edit('Demo edit');
  await h.login('alice');
  assert.equal(h.state.importedWorkouts.length,0);
  assert.equal(h.state.state.exercises.length,4);
  assert.equal(h.state.state.exercises[0].name,'');
  await h.flush();
  h.edit('Squat');await h.flush();
  assert.equal(decode(h.remote.draft,h.remote.workouts).state.exercises[0].name,'Squat');
  assert.equal(h.remote.workouts.size,0);
});
test('failed initial read never creates an empty account',async()=>{
  const h=await harness({offline:true});await h.login('alice');await h.flush();
  assert.equal(h.locked,true);assert.equal(h.writes,0);
  assert.match(h.element('cloud-status').textContent,/no empty log/);
});
test('pending edits survive reload and reconnect',async()=>{
  const h=await harness();await h.login('alice');await h.flush();
  h.offline();h.edit('Offline squat');await h.flush();
  assert.equal(JSON.parse(h.storage.get('pending:alice')).dirty,true);
  const reloaded=await harness({storage:h.storage,remote:h.remote,offline:true});
  await reloaded.login('alice');
  assert.equal(reloaded.state.state.exercises[0].name,'Offline squat');
  reloaded.online();await reloaded.click('cloud-retry');await reloaded.flush();
  assert.equal(decode(h.remote.draft,h.remote.workouts).state.exercises[0].name,'Offline squat');
  assert.equal(h.storage.has('pending:alice'),false);
});
test('concurrent cloud edits block stale saves and preserve pending data',async()=>{
  const h=await harness();await h.login('alice');await h.flush();
  h.edit('Local edit');h.remote.revision++;
  await h.flush();
  assert.equal(h.locked,true);
  assert.equal(h.element('cloud-resolve').hidden,false);
  assert.equal(JSON.parse(h.storage.get('pending:alice')).snapshot.state.exercises[0].name,'Local edit');
});
test('live changes load automatically; signing out removes private view',async()=>{
  const h=await harness();await h.login('alice');await h.flush();
  const updated=blank();updated.state.exercises[0].name='Remote exercise';
  const next=encode(updated);h.remote.draft=next.draft;h.remote.workouts=next.workouts;h.remote.revision++;
  await h.live();assert.equal(h.state.state.exercises[0].name,'Remote exercise');
  await h.login(null);assert.equal(h.state.importedWorkouts[0].id,'public');
  assert.equal(h.state.state.exercises[0].name,'');
});
test('a stale listener error cannot change signed-out controls',async()=>{
  const h=await harness();await h.login('alice');await h.flush();
  const staleError=h.listenerError;
  await h.login(null);
  const message=h.element('cloud-status').textContent;
  staleError(new Error('Old account disconnected'));
  assert.equal(h.element('cloud-retry').hidden,true);
  assert.equal(h.element('cloud-status').textContent,message);
});
test('another account never receives previous account or demo data',async()=>{
  const h=await harness();await h.login('alice');await h.flush();h.edit('Private Alice');await h.flush();
  h.remote.exists=false;h.remote.revision=0;h.remote.workouts=new Map();delete h.remote.draft;
  await h.login('bob');await h.flush();
  assert.equal(h.state.state.exercises[0].name,'');
  assert.equal(JSON.parse(h.storage.get('account:alice')).snapshot.state.exercises[0].name,'Private Alice');
});
