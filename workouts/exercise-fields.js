/* Reshape result fields while preserving values across modifier changes. */
const ExerciseFields = (() => {
  const copy = value => JSON.parse(JSON.stringify(value));
  function decode(exercise) {
    const weight = exercise.fields.findIndex(field => /weight/i.test(field));
    const indices = exercise.fields.map((_,i)=>i).filter(i=>i!==weight);
    const mode = exercise.measurement || (exercise.fields.some(f=>/seconds/i.test(f)) ? 'duration' : 'reps');
    const sides = exercise.unilateral ? 2 : 1;
    const combined = mode === 'repeaters' && indices.length === sides;
    const read = row => Array.from({length:sides},(_,side)=> {
      if (mode === 'repeaters') {
        if (!combined) return {reps:row[indices[side*2]] ?? '',duration:row[indices[side*2+1]] ?? ''};
        const value=String(row[indices[side]] ?? '');
        const match=value.match(/^\s*(.*?)\s*[×x*]\s*(.*?)\s*s?\s*$/i);
        return {reps:match ? match[1] : value,duration:match ? match[2].replace(/s$/i,'') : ''};
      }
      return {[mode]:row[indices[side]] ?? ''};
    });
    return {weight,mode,values:exercise.values.map(read),previous:exercise.previous.map(read)};
  }
  function encode(exercise,data,mode,unilateral) {
    const weighted=data.weight>=0;
    const fields=weighted ? [exercise.fields[data.weight]] : [];
    const metrics=mode==='repeaters' ? ['reps','duration'] : [mode];
    for(let side=0;side<(unilateral?2:1);side++) for(const metric of metrics) {
      const label=metric==='duration' ? 'Duration · seconds' : 'Reps';
      fields.push(unilateral ? `${side===0?'Left':'Right'} · ${label.toLowerCase()}` : label);
    }
    for(const property of ['values','previous']) {
      const weights=exercise[property].map(row=>weighted?row[data.weight]:'');
      exercise[property]=data[property].map((sides,i)=>[
        ...(weighted?[weights[i]]:[]),
        ...Array.from({length:unilateral?2:1},(_,side)=>metrics.map(metric=>sides[side]?.[metric] ?? '')).flat()
      ]);
    }
    exercise.fields=fields;
    exercise.measurement=mode;
    exercise.unilateral=unilateral;
  }
  function setMeasurement(exercise,mode) {
    const data=decode(exercise);
    exercise.measurementBackup ||= {values:[],previous:[]};
    for(const property of ['values','previous']) {
      data[property]=data[property].map((sides,i)=>sides.map((result,side)=> {
        const saved=exercise.measurementBackup[property][i]?.[side] || {};
        const merged={...saved,...result};
        // Reps and duration share one entry per side: changing the label
        // should keep the current entry, not replace it with a blank/old value.
        if (data.mode !== mode && ['reps','duration'].includes(data.mode) && ['reps','duration'].includes(mode)) {
          merged[mode] = result[data.mode];
        }
        exercise.measurementBackup[property][i] ||= [];
        exercise.measurementBackup[property][i][side]=copy(merged);
        return merged;
      }));
    }
    encode(exercise,data,mode,!!exercise.unilateral);
  }
  function setLaterality(exercise,unilateral) {
    if(!!exercise.unilateral===unilateral) return;
    const data=decode(exercise);
    exercise.resultRightBackup ||= {};
    for(const property of ['values','previous']) {
      if(!unilateral) exercise.resultRightBackup[property]=data[property].map(sides=>copy(sides[1] || {}));
      else data[property]=data[property].map((sides,i)=>[sides[0],copy(exercise.resultRightBackup[property]?.[i] || {})]);
    }
    encode(exercise,data,data.mode,unilateral);
  }
  function setCount(exercise,count) {
    if (!Number.isInteger(count) || count < 1 || count > Math.max(20,exercise.values.length)) return;
    for (const property of ['values','previous']) {
      exercise[property] = Array.from({length:count},(_,i) =>
        exercise[property][i] || exercise.fields.map(() => ''));
      // Removed sets must not reappear through a later modifier change.
      for (const backup of ['weightBackup','measurementBackup','resultRightBackup']) {
        if (Array.isArray(exercise[backup]?.[property])) exercise[backup][property].length = Math.min(exercise[backup][property].length,count);
      }
    }
  }
  return {setMeasurement,setLaterality,setCount};
})();
if(typeof module!=='undefined') module.exports=ExerciseFields;
