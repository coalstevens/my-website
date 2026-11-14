const test = require('node:test');
const assert = require('node:assert/strict');
const Feedback = require('../../workouts/js/archive-feedback.js');
const Archive = require('../../workouts/js/session-archive.js');
function harness() {
  let nextId = 0;
  const timers = new Map();
  const document = {activeElement:null, createElement:tag => element(tag)};
  function element(tag) {
    return {tag, ownerDocument:document, children:[], handlers:{}, textContent:'',
      addEventListener(name, callback) { this.handlers[name] = callback; },
      setAttribute() {},
      replaceChildren(...children) { this.children = children; },
      contains(node) { return node === this || this.children.includes(node); }
    };
  }
  const container = element('span');
  const feedback = Feedback.create(container, {
    schedule(callback, delay) { const id = ++nextId; timers.set(id, {callback,delay}); return id; },
    cancel(id) { timers.delete(id); }
  });
  return {feedback, container, timers, document,
    expire() { const callbacks=[...timers.values()]; timers.clear(); for(const {callback} of callbacks) callback(); },
    click() { container.children[1].handlers.click(); }
  };
}
test('archive feedback disappears after six seconds without applying undo', () => {
  const h=harness(); let calls=0;
  h.feedback.show('session archived',()=>{calls++;});
  assert.equal(h.container.children[0].textContent,'session archived');
  assert.equal([...h.timers.values()][0].delay,6000);
  h.expire(); assert.equal(h.container.children.length,0); assert.equal(calls,0);
});
test('undo restores the pre-archive state and dismisses the feedback', () => {
  const h=harness();
  const previous={date:'2026-01-01',notes:'Keep this',exercises:[{id:'ex',name:'Squat',fields:['Reps'],values:[[5]],previous:[['']]}]};
  let state=Archive.prepare(previous,'2026-01-02','entry').next;
  h.feedback.show('session archived',()=>{state=previous;});
  h.click(); assert.equal(state,previous); assert.equal(state.exercises[0].values[0][0],5);
  assert.equal(h.container.children.length,0); assert.equal(h.timers.size,0);
});
test('undo can restore the archive and overwritten draft after a pop', () => {
  const h=harness();
  const initial={date:'2026-01-01',notes:'Old',exercises:[{name:'Squat',fields:['Reps'],values:[[5]],previous:[['']]}]};
  const {entry,next}=Archive.prepare(initial,'2026-01-02','entry');
  next.notes='Unfinished current session';
  const previous=JSON.parse(JSON.stringify(next));
  let state=Archive.restore(next,entry);
  h.feedback.show('session restored from archive',()=>{state=previous;});
  h.click(); assert.equal(state.notes,'Unfinished current session'); assert.equal(state.archivedSessions[0].id,'entry');
});
test('invalidating undo prevents a stale button from reverting later work', () => {
  const h=harness(); let calls=0;
  h.feedback.show('session archived',()=>{calls++;});
  const button=h.container.children[1];
  h.feedback.clear();button.handlers.click();
  assert.equal(calls,0);assert.equal(h.timers.size,0);
});
test('failed undo stays available for retry', () => {
  const h=harness();h.feedback.show('session archived',()=>false);h.click();
  assert.equal(h.container.children.length,2);
});
test('hover and keyboard focus pause dismissal', () => {
  const h=harness();h.feedback.show('session archived',()=>{});
  h.container.handlers.mouseenter();assert.equal(h.timers.size,0);
  h.container.handlers.mouseleave();assert.equal(h.timers.size,1);
  h.document.activeElement=h.container.children[1];h.container.handlers.focusin();assert.equal(h.timers.size,0);
  h.container.handlers.focusout({relatedTarget:null});assert.equal(h.timers.size,1);
});
