/* Pure plate planning shared by the helper and exercise suggestions. */
const PlatePlanner = (() => {
  const compare = (a, b) => a[0]-b[0] || a[1]-b[1] || a[2]-b[2];
  function transition(from, to) {
    // Plates are ordered from the sleeve's inside outward. Anything outside
    // the common prefix must come off, even if it will be put straight back.
    let kept = 0;
    while (kept < from.length && kept < to.length && from[kept] === to[kept]) kept++;
    return [from.length-kept, from.length+to.length-2*kept];
  }
  function plan(values, bar, sizes, inventory) {
    if (!Number.isFinite(bar) || bar < 0) return values.map(() => ({error:'Enter a valid bar weight.'}));
    const pairs = sizes.map((size, i) => ({size, count:inventory[i]})).sort((a,b) => b.size-a.size);
    let reachable = new Set([0]);
    for (const {size,count} of pairs) {
      const next = new Set();
      for (const load of reachable) for (let n=0; n<=count; n++) next.add(load+n*size*2);
      reachable = next;
    }
    const cache = new Map();
    function candidates(value) {
      const target = Number(value);
      if (String(value).trim()==='' || !Number.isFinite(target) || target<0) return {error:'Enter a valid weight.'};
      if (target<bar) return {error:'Target weight is below the bar weight.'};
      let load = 0;
      for (const possible of reachable) {
        const delta=Math.abs(bar+possible-target), best=Math.abs(bar+load-target);
        if (delta<best || (delta===best && possible<load)) load=possible;
      }
      if (!cache.has(load)) {
        const options=[];
        function visit(i, remaining, plates) {
          if (i===pairs.length) { if (Math.abs(remaining)<.0001) options.push(plates); return; }
          const {size,count}=pairs[i];
          for (let n=0; n<=Math.min(count,Math.floor((remaining+.0001)/(2*size))); n++) {
            visit(i+1,remaining-n*size*2,plates.concat(Array(n).fill(size)));
          }
        }
        visit(0,load,[]);
        cache.set(load,options);
      }
      return {target,bar,total:bar+load,closest:load,options:cache.get(load)};
    }
    const sets=values.map(candidates), results=Array(values.length);
    let frontier=[{plates:[],cost:[0,0,0],path:[]}];
    function finish() {
      frontier.sort((a,b) => compare(a.cost,b.cost));
      for (const step of frontier[0].path) results[step.index]={...sets[step.index],plates:step.plates};
      frontier=[{plates:[],cost:[0,0,0],path:[]}];
    }
    sets.forEach((set,index) => {
      if (set.error) { finish(); results[index]=set; return; }
      frontier=set.options.map(plates => {
        let best;
        for (const previous of frontier) {
          const [removed,moved]=transition(previous.plates,plates);
          // Priorities: avoid unloading, minimize handling, then use fewer plates.
          const cost=[previous.cost[0]+removed,previous.cost[1]+moved,previous.cost[2]+plates.length];
          if (!best || compare(cost,best.cost)<0) best={plates,cost,path:previous.path.concat({index,plates})};
        }
        return best;
      });
    });
    finish();
    return results;
  }
  return {plan,transition};
})();
if (typeof module !== 'undefined') module.exports = PlatePlanner;
