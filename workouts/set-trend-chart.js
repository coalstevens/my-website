/* Plot every set, with equally spaced session groups rather than time spacing. */
const SetTrendChart = (() => {
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=value=>Number(value.toFixed(2)).toLocaleString('en-US');
  const date=value=>new Date(`${value}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toLowerCase();
  function build(sets,exercise,measure) {
    const points=HistoryAnalysis.setTrend(sets,exercise);
    const available=HistoryAnalysis.metrics(sets.filter(set=>set.exercise===exercise));
    if(measure==='auto') measure=available.load!==null && available.reps!==null ? 'dual' : available.reps!==null ? 'reps' : available.duration!==null ? 'duration' : available.repeaters!==null ? 'repeaters' : 'load';
    const metrics=measure==='dual' ? ['reps','load'] : [measure];
    const units={load:'lb',reps:'reps',duration:'seconds',repeaters:'work seconds'};
    if(!points.some(point=>metrics.some(metric=>point[metric].length))) return {markup:'<p class="chart-empty">no clear results for this exercise and measure. try another measure or date range.</p>',summary:''};
    const sessionCount=points.at(-1).sessionIndex+1;
    const band=Math.max(60,Math.max(...points.map(point=>point.setsInSession))*8+20);
    const width=Math.max(900,sessionCount*band+128),left=64,right=width-64,step=(right-left)/sessionCount;
    const maximum=Object.fromEntries(metrics.map(metric=>[metric,Math.max(1,...points.flatMap(point=>point[metric].map(result=>result.value)))]));
    const x=point=>left+point.sessionIndex*step+step*(point.setsInSession===1 ? .5 : .15+(point.setNumber-1)/(point.setsInSession-1)*.7);
    const y=(value,metric)=>190-value/maximum[metric]*150;
    let svg='';
    for(const fraction of [0,.5,1]) {
      const height=190-fraction*150;
      svg+=`<line class="chart-grid" x1="${left}" x2="${right}" y1="${height}" y2="${height}"/>`;
      metrics.forEach((metric,i)=>{svg+=`<text class="${metric}-axis" x="${i?right+10:left-10}" y="${height+4}" text-anchor="${i?'start':'end'}">${number(maximum[metric]*fraction)}</text>`;});
    }
    metrics.forEach((metric,i)=>{svg+=`<text class="${metric}-axis" x="${i?right:left}" y="20" text-anchor="${i?'end':'start'}">${metric==='load'?'weight · lb':units[metric]}${measure==='dual'?` · ${i?'right':'left'}`:''}</text>`;});
    for(let session=0;session<sessionCount;session++) {
      const rows=points.filter(point=>point.sessionIndex===session);
      const center=left+(session+.5)*step;
      svg+=`<text x="${center}" y="214" text-anchor="middle">${session+1}</text>`;
      if(session) svg+=`<line class="session-separator" x1="${left+session*step}" x2="${left+session*step}" y1="32" y2="195"/>`;
      for(const metric of metrics) for(const side of [0,1]) {
        let segment=[];
        const flush=()=> {
          if(segment.length) svg+=`<polyline class="dual-line ${metric==='load'?'load':'reps'}-series ${side?'side-right':''}" points="${segment.join(' ')}"/>`;
          segment=[];
        };
        for(const point of rows) {
          const result=point[metric].find(result=>result.side===side);
          if(!result) {flush();continue;}
          segment.push(`${x(point)},${y(result.value,metric)}`);
        }
        flush();
      }
    }
    for(const metric of metrics) for(const point of points) for(const result of point[metric]) {
      const sides=point.reps.length>1 || point.duration.length>1 || point.repeaters.length>1;
      const label=`session ${point.sessionIndex+1} · set ${point.setNumber}${(sides || result.side===1) && metric!=='load'?` · ${result.side?'right':'left'}`:''} · ${date(point.date)}: ${number(result.value)} ${units[metric]}`;
      svg+=`<circle class="dual-dot ${metric==='load'?'load':'reps'}-series ${result.side?'side-right':''}" cx="${x(point)}" cy="${y(result.value,metric)}" r="${result.side?4.5:3}" tabindex="0" role="img" aria-label="${escape(label)}" data-point-value="${escape(`${number(result.value)} ${units[metric]}`)}" data-point-label="${escape(label)}"></circle>`;
    }
    svg+=`<text x="${width/2}" y="237" text-anchor="middle">session · sets in recorded order</text>`;
    const description=`${exercise}: every recorded set, grouped into ${sessionCount} equally spaced sessions, oldest first. ${measure==='dual'?'Reps on the left axis; weight in pounds on the right.':''}`;
    const markup=`<div class="set-trend-scroll" tabindex="0" role="region" aria-label="All sets by session; scroll horizontally"><svg style="min-width:${width}px" viewBox="0 0 ${width} 246" role="img" aria-label="${escape(description)}">${svg}</svg></div>`;
    const plotted=points.filter(point=>metrics.some(metric=>point[metric].length)).length;
    const summary=`${plotted} sets across ${sessionCount} sessions`;
    return {markup,summary};
  }
  function attachTooltip(container) {
    const tooltip=document.createElement('div');
    tooltip.id='trend-point-tooltip';
    tooltip.className='chart-point-tooltip';
    tooltip.setAttribute('role','tooltip');
    tooltip.hidden=true;
    const value=document.createElement('strong'), detail=document.createElement('span');
    tooltip.append(value,detail);
    document.body.append(tooltip);
    let active=null;
    function hide() {
      if(active) { active.classList.remove('point-highlight'); active.removeAttribute('aria-describedby'); }
      active=null;
      tooltip.hidden=true;
    }
    function show(point) {
      if(!point || active===point) return;
      hide();
      active=point;
      value.textContent=point.dataset.pointValue;
      detail.textContent=point.dataset.pointLabel;
      point.classList.add('point-highlight');
      point.setAttribute('aria-describedby',tooltip.id);
      tooltip.hidden=false;
      const anchor=point.getBoundingClientRect(), box=tooltip.getBoundingClientRect();
      const left=Math.max(8,Math.min(window.innerWidth-box.width-8,anchor.left+anchor.width/2-box.width/2));
      const top=anchor.top-box.height-12>=8 ? anchor.top-box.height-12 : Math.max(8,Math.min(window.innerHeight-box.height-8,anchor.bottom+12));
      tooltip.style.left=`${left}px`;
      tooltip.style.top=`${top}px`;
    }
    const point=event=>event.target.closest('[data-point-value]');
    container.addEventListener('pointerover',event=>show(point(event)));
    container.addEventListener('pointermove',event=>{const target=point(event); if(target) show(target);});
    container.addEventListener('pointerout',event=>{if(point(event)===active) hide();});
    container.addEventListener('focusin',event=>show(point(event)));
    container.addEventListener('focusout',hide);
    container.addEventListener('chartupdate',hide);
    container.addEventListener('keydown',event=>{if(event.key==='Escape') hide();});
    window.addEventListener('scroll',hide,true);
    window.addEventListener('resize',hide);
  }
  return {build,attachTooltip};
})();
