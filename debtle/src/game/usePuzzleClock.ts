import { useEffect,useState } from 'react';
import { nextDailyReset,puzzleDate } from './daily';

export function usePuzzleClock() {
  const [now,setNow]=useState(()=>new Date());
  const today=puzzleDate(now);
  useEffect(()=>{
    const refresh=()=>setNow(new Date());
    const interval=window.setInterval(refresh,30000);
    const reset=window.setTimeout(refresh,Math.max(1,nextDailyReset(new Date()).getTime()-Date.now()+25));
    document.addEventListener('visibilitychange',refresh);
    window.addEventListener('focus',refresh);
    window.addEventListener('pageshow',refresh);
    return()=>{clearInterval(interval);clearTimeout(reset);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);};
  },[today]);
  return now;
}
