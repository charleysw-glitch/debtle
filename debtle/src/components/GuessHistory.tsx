import { Check, Navigation } from 'lucide-react';
import { countryById } from '../data';
import { bearing,direction,distanceKm,proximity } from '../game/geography';
import type { Country } from '../types';
export default function GuessHistory({guesses,answer,unit}:{guesses:string[];answer:Country;unit:'km'|'mi'}) {
  return <div className="guess-history" aria-live="polite" aria-label="Guess history">
    {guesses.length>0&&<div className="history-labels"><span>YOUR GUESSES</span><span>DISTANCE</span><span>DIRECTION</span><span>PROXIMITY</span></div>}
    {guesses.map((id,index)=>{
      const guess=countryById.get(id)!,correct=id===answer.iso3,km=distanceKm(guess.centroid,answer.centroid),deg=bearing(guess.centroid,answer.centroid),dir=direction(deg),score=correct?5:proximity(km);
      return <div className={`guess-row ${correct?'correct':''}`} key={id}><div className="guess-country"><span className="guess-number">{String(index+1).padStart(2,'0')}</span><strong>{guess.name}</strong></div><span className="guess-distance">{correct?'0':Math.round(unit==='km'?km:km*0.621371).toLocaleString('en-US')} <small>{unit}</small></span><span className="guess-direction" aria-label={correct?'Correct country':`${dir.name}, ${deg?.toFixed(0)} degrees`}>{correct?<Check size={21}/>:<Navigation size={19} style={{transform:`rotate(${(deg??0)-45}deg)`}}/>}</span><span className={`proximity proximity-${score}`} aria-label={`${score} out of 5 proximity`}>{Array.from({length:5},(_,i)=><i key={i} className={i<score?'filled':''}/>)}</span></div>;
    })}
    {guesses.length===0&&<div className="empty-history"><span className="empty-arrow">↗</span><p>Make your first country guess.<small>Distance and direction will guide you closer.</small></p></div>}
  </div>;
}
