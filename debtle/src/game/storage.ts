import type { SavedState, Preferences, Progress } from '../types';
import { countryById } from '../data';
import { puzzleDate, addCalendarDays, DAY_MS } from './daily';
export const STORAGE_KEY='debtle:v1';
export const defaultPreferences:Preferences={theme:'system',unit:'km',reducedMotion:false};
export const emptyState=():SavedState=>({version:1,daily:{},practice:null,recentPractice:[],preferences:{...defaultPreferences}});
function validProgress(value:unknown):value is Progress {
  if(!value||typeof value!=='object')return false;
  const p=value as Progress;
  return Array.isArray(p.guesses)&&p.guesses.length<=6&&p.guesses.every(x=>typeof x==='string'&&countryById.has(x))&&new Set(p.guesses).size===p.guesses.length&&['playing','won','lost'].includes(p.status)&&!(p.status==='playing'&&p.guesses.length===6)&&!(p.status==='lost'&&p.guesses.length!==6)&&!(p.status==='won'&&!p.guesses.length);
}
export function loadState(storage?:Pick<Storage,'getItem'>):SavedState {
  const state=emptyState();
  try {
    const raw=JSON.parse((storage??window.localStorage).getItem(STORAGE_KEY)||'null');
    if(!raw||raw.version!==1)return state;
    // Keys identify the frozen puzzle date and answer, not an instant. Preserve
    // UTC-era keys verbatim: shifting them would associate guesses with a different answer.
    if(raw.daily&&typeof raw.daily==='object')for(const [date,p] of Object.entries(raw.daily))if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&validProgress(p))state.daily[date]=p;
    if(validProgress(raw.practice)&&countryById.has(raw.practice.answer)&&typeof raw.practice.id==='string')state.practice=raw.practice;
    if(Array.isArray(raw.recentPractice))state.recentPractice=raw.recentPractice.filter((x:unknown)=>typeof x==='string'&&countryById.has(x)).slice(-15);
    const p=raw.preferences;
    if(p){if(['light','dark','system'].includes(p.theme))state.preferences.theme=p.theme;if(['km','mi'].includes(p.unit))state.preferences.unit=p.unit;if(typeof p.reducedMotion==='boolean')state.preferences.reducedMotion=p.reducedMotion;}
  }catch{/* Invalid or blocked storage starts with a clean in-memory game. */}
  return state;
}
export function saveState(state:SavedState,storage?:Pick<Storage,'setItem'>) {
  try{(storage??window.localStorage).setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}
}
export function statistics(daily:Record<string,Progress>,today=puzzleDate()) {
  const entries=Object.entries(daily).filter(([,p])=>p.status!=='playing').sort(([a],[b])=>a.localeCompare(b));
  const wins=entries.filter(([,p])=>p.status==='won').length,distribution=Array(6).fill(0) as number[];
  let maxStreak=0,run=0,previous='';
  for(const [date,p] of entries){
    if(p.status==='won') {run=previous&&Date.parse(date)-Date.parse(previous)===DAY_MS?run+1:1;distribution[p.guesses.length-1]++;maxStreak=Math.max(maxStreak,run);previous=date;}
    else {run=0;previous='';}
  }
  let currentStreak=0,cursor=today;
  if(!daily[cursor]||daily[cursor].status==='playing')cursor=addCalendarDays(today,-1);
  while(daily[cursor]?.status==='won'){currentStreak++;cursor=addCalendarDays(cursor,-1);}
  return {played:entries.length,wins,winPercent:entries.length?Math.round(wins/entries.length*100):0,currentStreak,maxStreak,distribution};
}
