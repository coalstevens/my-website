/* Conservative, dependency-free interpretation of the archive's freeform cells. */
const HistoryAnalysis = (() => {
  function result(value) {
    const text = String(value ?? '').trim();
    if (!text) return null;
    if (/^\d+(?:\.\d+)?$/.test(text)) return {kind:'reps', reps:Number(text)};
    const duration = text.match(/^(\d+(?:\.\d+)?)\s*(?:s|sec(?:onds?)?)$/i);
    if (duration) return {kind:'duration', seconds:Number(duration[1])};
    const repeater = text.match(/^(\d+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)\s*(?:s|sec(?:onds?)?)$/i);
    if (repeater) return {kind:'repeaters', reps:Number(repeater[1]), seconds:Number(repeater[2])};
    return null;
  }
  function load(value) {
    const text = String(value ?? '').trim();
    // Accept an explicit load, optionally followed by the recorded plate breakdown.
    const match = text.match(/^(\d+(?:\.\d+)?)\s*(?:(?:lb|lbs)\s*)?(?:$|\s*-\s*\S)/i);
    return match ? Number(match[1]) : null;
  }
  function name(value) {
    return String(value ?? '').toLowerCase().replace(/\s*--?\s*ss(?:\s*[a-d])?\s*$/i,'').replace(/\s+/g,' ').trim();
  }
  function records(workouts, edits={}) {
    const sets=[];
    let unparsed=0;
    for (const workout of workouts) {
      let exercise='';
      workout.rows.forEach((source,ri)=> {
        const cell=ci=>String(edits[`${workout.id}:${ri}:${ci}`] ?? source[ci] ?? '').trim();
        const title=name(cell(0));
        if (title) exercise=['[unidentified exercise]','session notes'].includes(title) ? '' : title;
        const values=[cell(2),cell(3)];
        const results=values.map((value,side)=> { const parsed=result(value); return parsed ? {...parsed,side} : null; }).filter(Boolean);
        if (!results.length || !exercise) {
          if (values.some(Boolean)) unparsed++;
          return;
        }
        sets.push({session:workout.id,date:workout.date,exercise,weight:load(cell(1)),results});
      });
    }
    return {sets,unparsed};
  }
  function maximum(values) {
    const numbers=values.filter(value=>value!==null && value!==undefined);
    return numbers.length ? Math.max(...numbers) : null;
  }
  function metrics(sets) {
    return {
      load:maximum(sets.map(set=>set.weight)),
      reps:maximum(sets.flatMap(set=>set.results.filter(r=>r.kind==='reps').map(r=>r.reps))),
      duration:maximum(sets.flatMap(set=>set.results.filter(r=>r.kind==='duration').map(r=>r.seconds))),
      repeaters:maximum(sets.flatMap(set=>set.results.filter(r=>r.kind==='repeaters').map(r=>r.reps*r.seconds)))
    };
  }
  function summarize(sets,sort = 'sessions') {
    const groups=new Map();
    for (const set of sets) {
      if (!groups.has(set.exercise)) groups.set(set.exercise,[]);
      groups.get(set.exercise).push(set);
    }
    return [...groups].map(([exercise,rows])=>({exercise,sets:rows.length,sessions:new Set(rows.map(row=>row.session)).size,lastDate:rows.reduce((latest,row)=>row.date>latest ? row.date : latest,''),...metrics(rows)}))
      .sort((a,b)=>(sort==='recent' ? b.lastDate.localeCompare(a.lastDate) : 0) || b.sessions-a.sessions || a.exercise.localeCompare(b.exercise));
  }
  function calendar(workouts,from,to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '') || from>to) return [];
    const counts=new Map();
    for(const workout of workouts) counts.set(workout.date,(counts.get(workout.date)||0)+1);
    const years=[];
    for(let year=Number(from.slice(0,4));year<=Number(to.slice(0,4));year++) {
      const start=new Date(`${String(year).padStart(4,'0')}-01-01T00:00:00Z`);
      const firstWeekday=start.getUTCDay();
      const days=[];
      for(let day=new Date(start),index=0;day.getUTCFullYear()===year;day.setUTCDate(day.getUTCDate()+1),index++) {
        const date=day.toISOString().slice(0,10);
        const inRange=date>=from && date<=to;
        days.push({date,weekday:day.getUTCDay(),week:Math.floor((index+firstWeekday)/7),inRange,count:inRange ? counts.get(date)||0 : 0});
      }
      years.push({year,days});
    }
    return years;
  }
  function setTrend(sets,exercise) {
    const sessions=new Map();
    for(const set of sets.filter(set=>set.exercise===exercise)) {
      if(!sessions.has(set.session)) sessions.set(set.session,[]);
      sessions.get(set.session).push(set);
    }
    return [...sessions.values()].sort((a,b)=>a[0].date.localeCompare(b[0].date)).flatMap((rows,sessionIndex)=>rows.map((row,index)=>({
      session:row.session,date:row.date,sessionIndex,setNumber:index+1,setsInSession:rows.length,
      load:row.weight==null ? [] : [{value:row.weight,side:0}],
      reps:row.results.filter(result=>result.kind==='reps').map((result,i)=>({value:result.reps,side:result.side ?? i})),
      duration:row.results.filter(result=>result.kind==='duration').map((result,i)=>({value:result.seconds,side:result.side ?? i})),
      repeaters:row.results.filter(result=>result.kind==='repeaters').map((result,i)=>({value:result.reps*result.seconds,side:result.side ?? i}))
    })));
  }
  function exerciseSnapshot(sets,label,year = new Date().getFullYear()) {
    // The default current-session template has a few presentation-only labels.
    const templateLabels = {'squat':'squats','explosive pull-up':'explosive pullups','lock-off · 90°':'lock offs (90)'};
    const key=name(label);
    const exercise=Object.hasOwn(templateLabels,key) ? templateLabels[key] : key;
    const rows=sets.filter(set=>set.exercise===exercise);
    const lastDate=rows.reduce((latest,set)=>set.date>latest ? set.date : latest,'');
    return {exercise,sessions:new Set(rows.map(row=>row.session)).size,sessionsThisYear:new Set(rows.filter(row=>row.date.slice(0,4)===String(year)).map(row=>row.session)).size,sets:rows.length,lastDate,...metrics(rows)};
  }
  return {result,load,name,records,metrics,summarize,calendar,setTrend,exerciseSnapshot};
})();
if (typeof module!=='undefined') module.exports=HistoryAnalysis;
