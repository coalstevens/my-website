/* Real links first; a small zoom transition progressively enhances navigation. */
(() => {
  const key='training-page-zoom';
  const main=document.querySelector('[data-page-transition]') || document.querySelector('main');
  if(!main) return;
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let leaving=false, exitAnimation=null;
  function arrival() {
    try {
      const pending=JSON.parse(sessionStorage.getItem(key) || 'null');
      sessionStorage.removeItem(key);
      if(!pending || pending.target!==location.href || Date.now()-pending.time>15000 || reduced() || !main.animate) return;
      document.body.classList.add('page-zooming');
      const animation=main.animate([
        {transform:`scale(${pending.direction==='out'?1.055:.945})`,opacity:.25},
        {transform:'scale(1)',opacity:1}
      ],{duration:320,easing:'cubic-bezier(.22,.8,.25,1)'});
      animation.finished.then(()=>document.body.classList.remove('page-zooming'),()=>document.body.classList.remove('page-zooming'));
    } catch { /* Navigation still works when storage is unavailable. */ }
  }
  arrival();
  document.addEventListener('click',event=> {
    const link=event.target.closest?.('a[data-zoom]');
    if(!link || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target!=='_self')) return;
    const target=new URL(link.href,location.href);
    if(target.origin!==location.origin || target.href===location.href) return;
    if(reduced() || !main.animate) return;
    event.preventDefault();
    if(leaving) return;
    leaving=true;
    const direction=link.dataset.zoom;
    try { sessionStorage.setItem(key,JSON.stringify({direction,target:target.href,time:Date.now()})); } catch {}
    document.body.classList.add('page-zooming');
    exitAnimation=main.animate([
      {transform:'scale(1)',opacity:1},
      {transform:`scale(${direction === 'out' ? .945 : 1.055})`,opacity:.15}
    ],{duration:180,easing:'cubic-bezier(.4,0,.8,.4)',fill:'forwards'});
    exitAnimation.finished.then(()=>location.assign(target.href),()=>{leaving=false;document.body.classList.remove('page-zooming');});
  }, {capture:true});
  window.addEventListener('pageshow',event=> {
    if(event.persisted) {
      exitAnimation?.cancel();
      document.body.classList.remove('page-zooming');
      leaving=false;
      try { sessionStorage.removeItem(key); } catch {}
    }
  });
})();
