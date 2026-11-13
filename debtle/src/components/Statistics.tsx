import { Flame, Trophy } from 'lucide-react';
import type { Progress } from '../types';
import { statistics } from '../game/storage';
export default function Statistics({daily,today}:{daily:Record<string,Progress>;today:string}) {
  const stats=statistics(daily,today),maximum=Math.max(1,...stats.distribution);
  return <div className="stats-content"><p className="muted">Your Daily Challenge results.</p><div className="stats-grid">{[[stats.played,'Played'],[`${stats.winPercent}%`,'Win rate'],[stats.currentStreak,'Current streak'],[stats.maxStreak,'Best streak']].map(([value,label])=><div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><h3>Guess distribution</h3><div className="distribution">{stats.distribution.map((n,i)=><div key={i}><span>{i+1}</span><div style={{width:`${Math.max(8,n/maximum*100)}%`}}><strong>{n}</strong></div></div>)}</div><div className="stats-footer"><Trophy size={16}/>{stats.wins} daily {stats.wins===1?'win':'wins'}<Flame size={16}/><span>Practice is just for fun.</span></div><p className="small muted">Saved in this browser. Clearing browser storage resets your progress and statistics.</p></div>;
}
