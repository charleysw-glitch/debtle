import pool from '../data/daily-pool-v1.json';
export const DAY_MS=86400000;
export const utcDate=(date=new Date())=>date.toISOString().slice(0,10);
export const dayIndex=(date:string)=>Math.floor((Date.parse(date+'T00:00:00Z')-Date.parse(pool.epoch+'T00:00:00Z'))/DAY_MS);
function hash(input:string) { let h=2166136261; for(const c of input){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0; }
export function shuffledPool(cycle:number) {
  const ids=[...pool.countries];let state=hash(`${pool.salt}:${cycle}`);
  const next=()=>{state=(state+0x6D2B79F5)|0;let t=Math.imul(state^(state>>>15),1|state);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  return ids;
}
export function dailyPuzzle(date=utcDate()) {
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
