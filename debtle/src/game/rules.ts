import type { Country, Progress } from '../types';
export const MAX_GUESSES=6;
export const blankProgress=():Progress=>({guesses:[],status:'playing'});
export function submitGuess(progress:Progress,guess:string,answer:string):Progress {
  if(progress.status!=='playing'||progress.guesses.length>=MAX_GUESSES||progress.guesses.includes(guess))return progress;
  const guesses=[...progress.guesses,guess];
  return {guesses,status:guess===answer?'won':guesses.length===MAX_GUESSES?'lost':'playing'};
}
export const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
export function searchCountries(countries:Country[],query:string,excluded:string[]=[]) {
  const q=normalize(query);
  return countries.filter(c=>!excluded.includes(c.iso3)&&(!q||[c.name,...c.aliases].some(n=>normalize(n).includes(q))))
    .toSorted((a,b)=>{
      const rank=(c:Country)=>[c.name,...c.aliases].some(n=>normalize(n)===q)?0:normalize(c.name).startsWith(q)?1:2;
      return rank(a)-rank(b)||a.name.localeCompare(b.name);
    });
}
