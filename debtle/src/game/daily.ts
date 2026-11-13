import pool from '../data/daily-pool-v1.json' with { type:'json' };
export const DAY_MS=86400000;
export const PUZZLE_TIME_ZONE='America/New_York';
export const utcDate=(date=new Date())=>date.toISOString().slice(0,10);
const easternCalendar=new Intl.DateTimeFormat('en-US',{timeZone:PUZZLE_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
/** A common puzzle date for every player, independent of their device timezone. */
export function puzzleDate(date=new Date()) {
  const parts=easternCalendar.formatToParts(date);
  const part=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
/** Calendar arithmetic on date labels, not elapsed time between actual resets. */
export const addCalendarDays=(date:string,days:number)=>utcDate(new Date(Date.parse(date+'T00:00:00Z')+days*DAY_MS));
/** Find the first instant of the next Eastern calendar day, including 23/25-hour days. */
export function nextDailyReset(now=new Date()):Date {
  const nextDate=addCalendarDays(puzzleDate(now),1);
  let before=now.getTime(),after=before+36*60*60*1000;
  while(after-before>1){
    const middle=Math.floor((before+after)/2);
    if(puzzleDate(new Date(middle))<nextDate)before=middle;else after=middle;
  }
  return new Date(after);
}
export function dailyCountdown(now=new Date()):string {
  const minutes=Math.max(0,Math.ceil((nextDailyReset(now).getTime()-now.getTime())/60000));
  return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
}
export const dayIndex=(date:string)=>Math.floor((Date.parse(date+'T00:00:00Z')-Date.parse(pool.epoch+'T00:00:00Z'))/DAY_MS);
function hash(input:string) { let h=2166136261; for(const c of input){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0; }
export function shuffledPool(cycle:number) {
  const ids=[...pool.countries];let state=hash(`${pool.salt}:${cycle}`);
  const next=()=>{state=(state+0x6D2B79F5)|0;let t=Math.imul(state^(state>>>15),1|state);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  return ids;
}
export function dailyPuzzle(date=puzzleDate()) {
  const day=dayIndex(date),length=pool.countries.length,cycle=Math.floor(day/length);
  const index=((day%length)+length)%length;
  return {date,number:day+1,answer:shuffledPool(cycle)[index],version:pool.version,id:`${pool.version}:${date}`};
}
export function choosePractice(ids:string[],daily:string,recent:string[],random=Math.random) {
  let options=ids.filter(id=>id!==daily&&!recent.slice(-15).includes(id));
  if(!options.length)options=ids.filter(id=>id!==daily);
  if(!options.length)options=ids;
  return options[Math.min(options.length-1,Math.floor(random()*options.length))];
}
