/* Decorative motion only: callers commit storage and render before playing it. */
const ArchiveMotion = (() => {
  let animations=[], ghosts=[], hosts=[];
  function clear() {
    animations.forEach(animation=>animation.cancel());
    ghosts.forEach(ghost=>ghost.remove());
    hosts.forEach(host=>host.classList.remove('archive-motion-host'));
    animations=[]; ghosts=[]; hosts=[];
  }
  function enabled() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof Element.prototype.animate==='function';
  }
  function capture(element) {
    clear();
    if (!element || !enabled() || !element.getBoundingClientRect().height) return null;
    const clone=element.cloneNode(true);
    const originalFields=element.querySelectorAll('input,textarea,select');
    clone.querySelectorAll('input,textarea,select').forEach((field,i)=>{field.value=originalFields[i].value;});
    [clone,...clone.querySelectorAll('[id]')].forEach(node=>node.removeAttribute('id'));
    clone.querySelectorAll('label[for]').forEach(label=>label.removeAttribute('for'));
    return {clone,height:element.getBoundingClientRect().height};
  }
  function play(direction,snapshot) {
    if (!enabled()) return;
    const pushing=direction==='push';
    const current=document.querySelector('#exercises');
    const archive=document.querySelector('#history-workouts');
    const active=archive.querySelector('.archive-workout:not([hidden])');
    const source=pushing ? current : archive;
    const motion={duration:420,easing:'cubic-bezier(.22,.8,.25,1)'};
    if(snapshot) {
      source.classList.add('archive-motion-host');
      hosts.push(source);
      const ghost=document.createElement('div');
      ghost.className='archive-action-ghost';
      ghost.setAttribute('aria-hidden','true');
      ghost.inert=true;
      ghost.style.height=`${Math.min(snapshot.height,source.getBoundingClientRect().height || snapshot.height)}px`;
      ghost.append(snapshot.clone);
      source.append(ghost);
      ghosts.push(ghost);
      animations.push(ghost.animate([
        {transform:'translateY(0) scale(1)',opacity:.8},
        {transform:`translateY(${pushing?32:-32}px) scale(.975)`,opacity:0}
      ],{...motion,duration:260,fill:'forwards'}));
    }
    [...current.children].filter(child=>!child.classList.contains('archive-action-ghost')).forEach((exercise,i)=> {
      animations.push(exercise.animate([
        {transform:`translateY(${pushing?-14:28}px)`,opacity:0},
        {transform:'translateY(0)',opacity:1}
      ],{...motion,delay:80+Math.min(i,5)*25,fill:'backwards'}));
    });
    if(active) animations.push(active.animate([
      {transform:`translateY(${pushing?-32:14}px) scale(.985)`,opacity:.15},
      {transform:'translateY(0) scale(1)',opacity:1}
    ],{...motion,delay:pushing?110:40,fill:'backwards'}));
    const notes=document.querySelector('#notes');
    animations.push(notes.animate([{opacity:.3},{opacity:1}],{...motion,delay:100,fill:'backwards'}));
    const batch=animations;
    Promise.allSettled(batch.map(animation=>animation.finished)).then(()=>{if(animations===batch) clear();});
  }
  return {capture,play,clear};
})();
