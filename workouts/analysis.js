const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const formatDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toLowerCase();
const display = value => value===null || value===undefined ? '—' : Number(value.toFixed(2)).toLocaleString('en-US');
let sessions = [], sets = [], filteredSets = [];
let analysisSnapshot = {state:{exercises:[]}, archiveEdits:{}, importedWorkouts:[]};
let analysisMessage = '';
function reloadData(resetDates = false) {
  const {state, archiveEdits:edits, importedWorkouts:history} = analysisSnapshot;
  const removed = Array.isArray(state?.removedArchiveIds) ? state.removedArchiveIds : [];
  const local = Array.isArray(state?.archivedSessions) ? state.archivedSessions : [];
  sessions = [...local,...history].filter(session=>!removed.includes(session.id) && /^\d{4}-\d{2}-\d{2}$/.test(session.date) && Array.isArray(session.rows)).sort((a,b)=>a.date.localeCompare(b.date));
  sets = HistoryAnalysis.records(sessions,edits && typeof edits==='object' ? edits : {}, state.exercises || []).sets;
  if (resetDates || !$('#from-date').value || !$('#to-date').value) setAllDates();
  render();
}
function setAllDates() {
  $('#from-date').value = sessions[0]?.date || '';
  $('#to-date').value = sessions.at(-1)?.date || '';
}
function emptyChart(container,message) { container.innerHTML=`<p class="chart-empty">${escapeHTML(message)}</p>`; }
function frequencyChart(workouts,from,to) {
  const container=$('#frequency-chart');
  const currentYear=new Date().getFullYear();
  const selector=$('#activity-year');
  const availableYears=[...new Set([currentYear,...sessions.map(session=>Number(session.date.slice(0,4))).filter(year=>year<=currentYear)])].sort((a,b)=>b-a);
  const previous=Number(selector.value || currentYear);
  selector.innerHTML=availableYears.map(year=>`<option value="${year}">${year}${year===currentYear?' · this year':''}</option>`).join('');
  const selected=availableYears.includes(previous) ? previous : currentYear;
  selector.value=String(selected);
  const years=HistoryAnalysis.calendar(workouts,`${selected}-01-01`,`${selected}-12-31`);
  years.forEach(({days})=>days.forEach(day=> {
    day.inRange=(!from || day.date>=from) && (!to || day.date<=to);
    if (!day.inRange) day.count=0;
  }));
  const step=15, left=40, top=26;
  container.innerHTML=[...years].reverse().map(({year,days})=> {
    const active=days.filter(day=>day.count>0);
    const count=active.reduce((sum,day)=>sum+day.count,0);
    const months=days.filter(day=>day.date.endsWith('-01')).map(day=> {
      const label=new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US',{month:'short'}).toLowerCase();
      return `<text x="${left+day.week*step}" y="15">${label}</text>`;
    }).join('');
    const weekdays=[['mon',0],['fri',6]].map(([label,row])=>`<text x="0" y="${top+row*step+10}">${label}</text>`).join('');
    const cells=days.map(day=>`<rect class="calendar-day ${!day.inRange?'day-outside':day.count?'day-active':'day-rest'}" x="${left+day.week*step}" y="${top+day.weekday*step}" width="11" height="11"><title>${formatDate(day.date)} · ${day.inRange?`${day.count} ${day.count===1?'session':'sessions'}`:'outside selected dates'}</title></rect>`).join('');
    const description=`${year}: ${active.length} training days, ${count} sessions. Columns are weeks, rows are days, Sunday to Saturday. Filled green squares indicate a session.`;
    return `<section class="calendar-year" aria-label="${year} training activity"><div class="calendar-year-heading"><h3>${year}</h3><span>${active.length} training days · ${count} sessions</span></div><div class="calendar-scroll" tabindex="0" role="region" aria-label="${year} daily activity grid, scroll horizontally"><svg viewBox="0 0 850 136" role="img" aria-label="${escapeHTML(description)}">${months+weekdays+cells}</svg></div></section>`;
  }).join('');
}
function trendChart() {
  $('#trend-chart').dispatchEvent(new Event('chartupdate'));
  try {
    const chart=SetTrendChart.build(filteredSets,$('#trend-exercise').value,$('#trend-metric').value);
    $('#trend-chart').innerHTML=chart.markup;
    $('#trend-summary').textContent=chart.summary;
  } catch(error) {
    console.error('Exercise trend could not render',error);
    emptyChart($('#trend-chart'),'could not draw the exercise trend. refresh to load the latest chart code.');
    $('#trend-summary').textContent='';
  }
}
let breakdownRows = [];
let breakdownPage = 0;
const breakdownPageSize = 10;
function renderBreakdown() {
  const pages = Math.ceil(breakdownRows.length / breakdownPageSize);
  breakdownPage = Math.max(0, Math.min(breakdownPage, pages-1));
  const start = breakdownPage * breakdownPageSize;
  const rows = breakdownRows.slice(start, start+breakdownPageSize);
  $('#exercise-breakdown').innerHTML = rows.length ? rows.map(row=>`<tr><th scope="row"><button type="button" data-exercise="${escapeHTML(row.exercise)}">${escapeHTML(row.exercise)}</button></th>${['sessions','sets','load','reps','duration','repeaters'].map(key=>`<td>${display(row[key])}</td>`).join('')}</tr>`).join('') : '<tr><td colspan="7">no recorded results in this range.</td></tr>';
  $('#breakdown-position').textContent = pages ? `${breakdownPage+1} / ${pages} · ${start+1}–${start+rows.length} of ${breakdownRows.length}` : '0 exercises';
  $('#breakdown-previous').disabled = breakdownPage === 0;
  $('#breakdown-next').disabled = breakdownPage >= pages-1;
}
$('#breakdown-sort').addEventListener('change', () => {
  breakdownRows = HistoryAnalysis.summarize(filteredSets,$('#breakdown-sort').value);
  breakdownPage = 0;
  renderBreakdown();
});
$('#breakdown-previous').addEventListener('click', () => { breakdownPage--; renderBreakdown(); });
$('#breakdown-next').addEventListener('click', () => { breakdownPage++; renderBreakdown(); });
function render() {
  const from=$('#from-date').value,to=$('#to-date').value;
  $('#to-date').setCustomValidity(from && to && from>to ? 'The end date must be on or after the start date.' : '');
  if (from && to && from>to) { $('#analysis-filters').reportValidity(); return; }
  const workouts=sessions.filter(session=>session.date>=from && session.date<=to);
  filteredSets=sets.filter(set=>set.date>=from && set.date<=to);
  const summary=HistoryAnalysis.summarize(filteredSets);
  const dates=new Set(workouts.map(workout=>workout.date));
  const stats=[['sessions',workouts.length],['training days',dates.size],['recorded sets',filteredSets.length],['exercises',summary.length]];
  $('#analysis-stats').innerHTML=stats.map(([label,value])=>`<div><strong>${display(value)}</strong><span>${label}</span></div>`).join('');
  const previous=$('#trend-exercise').value || new URLSearchParams(location.search).get('exercise');
  $('#trend-exercise').innerHTML=summary.map(row=>`<option value="${escapeHTML(row.exercise)}">${escapeHTML(row.exercise)}</option>`).join('');
  if (summary.some(row=>row.exercise===previous)) $('#trend-exercise').value=previous;
  $('#trend-exercise').disabled=!summary.length;
  breakdownRows = HistoryAnalysis.summarize(filteredSets,$('#breakdown-sort').value);
  breakdownPage = 0;
  renderBreakdown();
  frequencyChart(workouts,from,to);
  trendChart();
  $('#analysis-content').hidden=false;
  $('#analysis-status').textContent = analysisMessage;
  $('#analysis-status').hidden = !analysisMessage;
}
$('#analysis-filters').addEventListener('submit',event=>{event.preventDefault();render();});
$('#analysis-filters').addEventListener('change',render);
$('#all-dates').addEventListener('click',()=>{setAllDates();render();});
$('#activity-year').addEventListener('change',()=> {
  const from=$('#from-date').value,to=$('#to-date').value;
  if (from && to && from>to) return;
  frequencyChart(sessions.filter(session=>(!from || session.date>=from) && (!to || session.date<=to)),from,to);
});
SetTrendChart.attachTooltip($('#trend-chart'));
$('#trend-exercise').addEventListener('change',trendChart);
$('#trend-metric').addEventListener('change',trendChart);
$('#exercise-breakdown').addEventListener('click',event=>{
  const button=event.target.closest('[data-exercise]');
  if (!button) return;
  $('#trend-exercise').value=button.dataset.exercise;
  trendChart();
  $('#trend-exercise').focus({preventScroll:true});
  $('#trend-title').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
});
window.WorkoutAnalysisBridge = {
  apply(snapshot, message = '', resetDates = false) {
    analysisSnapshot = snapshot;
    analysisMessage = message;
    reloadData(resetDates);
  },
  message(text) {
    analysisMessage = text;
    $('#analysis-status').hidden = !text;
    $('#analysis-status').textContent = text;
  }
};
