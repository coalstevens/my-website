/* Explicit source/archive migration, not an analysis-time alias layer. */
const ArchiveCleanup = (() => {
  const aliases = {
    'row':'low row','rows':'low row','low rows':'low row','bent over row':'low row',
    'bent over rows':'low row','bent-over row':'low row',
    'weighted pull ups':'weighted pullups','deadlifts':'deadlift',
    'dumbell pullover':'dumbbell pullover','ring flys':'ring fly',
    'ext rot':'ext rotations','ext rotate':'ext rotations',
    'wipers':'windshield wipers','hip rotations, warm up?':'hip rotations',
    'negatives':'one arm negatives','spotter arm bat hang':'bat hang','bat hangs':'bat hang'
  };
  const notes = new Set([
    '3 min rest','(hip to sky)','(out in front)','alt pinky/thumb up',
    'and splits / ham stretch','density','endurance','on machine','supports 24/25',
    'slow, controlled','good form only baby','ditch this exercise','do 5, 8',
    'get rid of a warm up set','go 135 r','groin + back pain typical',
    'i need to make this exercise better','awesomewoody','7 reps, 3 sets','7s/3s repeaters'
  ]);
  const standalone = new Set(['density','endurance']);
  const normalize = text => String(text ?? '').toLowerCase().replace(/\s+/g,' ').trim();
  const base = text => normalize(text).replace(/\s*--?\s*ss(?:\s*[a-d])?\s*$/i,'');
  function title(text) {
    const key=base(text);
    return Object.hasOwn(aliases,key) ? aliases[key] : key;
  }
  function appendNote(row,text) {
    while(row.length<5) row.push('');
    if (!row[4].split(' | ').includes(text)) row[4]=row[4] ? `${row[4]} | ${text}` : text;
  }
  function cleanSession(session) {
    let start=-1;
    const finish = end => {
      if (start<0 || base(session.rows[start][0])!=='pullups') return;
      const weighted=session.rows.slice(start,end).some(row=> {
        const text=String(row[1] ?? '').trim();
        const match=text.match(/^(\d+(?:\.\d+)?)\s*(?:(?:lb|lbs)\s*)?(?:$|\s*-\s*\S)/i);
        return match && Number(match[1])>0;
      });
      if(weighted) session.rows[start][0]=session.rows[start][0].replace(/^pullups/,'weighted pullups');
    };
    session.rows.forEach((row,i)=> {
      const original=String(row[0] ?? '').trim();
      if(!original) return;
      const key=base(original);
      if(notes.has(key)) {
        appendNote(row,original);
        if(standalone.has(key)) {
          finish(i);
          row[0]='[unidentified exercise]';
          start=i;
        } else row[0]='';
        return;
      }
      finish(i);
      start=i;
      row[0]=title(original);
      if(key==='hip rotations, warm up?') appendNote(row,'warm up?');
    });
    finish(session.rows.length);
    if(Array.isArray(session.exercises)) {
      let offset=0;
      for(const exercise of session.exercises) {
        exercise.name=session.rows[offset]?.[0] || title(exercise.name);
        offset+=exercise.values.length;
      }
    }
    return session;
  }
  function migrateStorage(imported) {
    const version='training-archive-cleanup-v2';
    if(localStorage.getItem(version)==='done') return false;
    const stateKey='training-design-prototype-v1',editKey='training-archive-cell-edits-v1';
    const originalState=localStorage.getItem(stateKey),originalEdits=localStorage.getItem(editKey);
    const state=JSON.parse(originalState || '{}'), edits=JSON.parse(originalEdits || '{}');
    const sessions=[...(state.archivedSessions || []),...imported];
    for(const session of sessions) {
      const effective={...session,rows:session.rows.map((row,ri)=> {
        const length=Math.max(row.length,5);
        return Array.from({length},(_,ci)=>String(edits[`${session.id}:${ri}:${ci}`] ?? row[ci] ?? ''));
      })};
      cleanSession(effective);
      // Persist corrections to actual saved overrides, rather than mapping names in analytics.
      effective.rows.forEach((row,ri)=> {
        for(const ci of [0,4]) {
          const key=`${session.id}:${ri}:${ci}`;
          if(Object.hasOwn(edits,key) || row[ci]!==String(session.rows[ri][ci] ?? '')) edits[key]=row[ci];
        }
      });
      if(session.local) {session.rows=effective.rows; cleanSession(session);}
    }
    if(Array.isArray(state.exercises)) state.exercises.forEach(exercise=>{ exercise.name=title(exercise.name); });
    // Keep recoverable originals before writing either storage key.
    if(originalState!==null) localStorage.setItem(`${version}-state-backup`,originalState);
    if(originalEdits!==null) localStorage.setItem(`${version}-edits-backup`,originalEdits);
    try {
      if(originalState!==null) localStorage.setItem(stateKey,JSON.stringify(state));
      if(originalEdits!==null || Object.keys(edits).length) localStorage.setItem(editKey,JSON.stringify(edits));
      localStorage.setItem(version,'done');
      return true;
    } catch(error) {
      if(originalState===null) localStorage.removeItem(stateKey); else localStorage.setItem(stateKey,originalState);
      if(originalEdits===null) localStorage.removeItem(editKey); else localStorage.setItem(editKey,originalEdits);
      throw error;
    }
  }
  return {cleanSession,title,migrateStorage};
})();
if(typeof module!=='undefined') module.exports=ArchiveCleanup;
