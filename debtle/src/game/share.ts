import type { Country, Progress } from '../types';
import { distanceKm,proximity } from './geography';
export function shareText(progress:Progress,answer:Country,countries:Map<string,Country>,label:string) {
  const squares=progress.guesses.map(id=>id===answer.iso3?'🟩':['🟥','🟧','🟨','🟦','🟪'][proximity(distanceKm(countries.get(id)!.centroid,answer.centroid))-1]).join('');
  return `Debtle ${label} 🌍\n${progress.status==='won'?`Solved in ${progress.guesses.length}/6`:'6/6 — see you tomorrow'}\n\n${squares}\n\nGuess the country from its creditors.\n${typeof location!=='undefined'?location.origin:''}`;
}
