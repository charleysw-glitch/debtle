import { useEffect, useState } from 'react';
import { ArrowRight, ChartNoAxesColumnIncreasing, Check, CircleHelp, Clock3, Copy, ExternalLink, Globe2, Info as InfoIcon, Settings2, Share2, Shuffle, Sparkles, X } from 'lucide-react';
import { countries, countryById, flag } from './data';
import { choosePractice, dailyPuzzle, utcDate } from './game/daily';
import { blankProgress, MAX_GUESSES, submitGuess } from './game/rules';
import { loadState, saveState } from './game/storage';
import { shareText } from './game/share';
import type { Mode, SavedState } from './types';
import Treemap from './components/Treemap';
import CountrySearch from './components/CountrySearch';
import GuessHistory from './components/GuessHistory';
import Modal from './components/Modal';
import Info from './components/Info';
import HowToPlay from './components/HowToPlay';
import Settings from './components/Settings';
import Statistics from './components/Statistics';
import CountryProfile from './components/CountryProfile';

type Dialog = 'help'|'stats'|'settings'|'info'|null;
export default function App() {
  const [saved,setSaved]=useState<SavedState>(()=>loadState()),[mode,setMode]=useState<Mode>('daily'),[dialog,setDialog]=useState<Dialog>(null),[now,setNow]=useState(()=>new Date()),[storageOk,setStorageOk]=useState(true),[notice,setNotice]=useState(''),[manualShare,setManualShare]=useState(false);
  const today=utcDate(now),daily=dailyPuzzle(today),progress=mode==='daily'?(saved.daily[today]??blankProgress()):(saved.practice??blankProgress());
  const answerId=mode==='daily'?daily.answer:saved.practice?.answer??daily.answer,answer=countryById.get(answerId)!;
  const complete=progress.status!=='playing';
  useEffect(()=>{setStorageOk(saveState(saved));},[saved]);
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),30000);const wake=()=>setNow(new Date());document.addEventListener('visibilitychange',wake);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',wake);};},[]);
  useEffect(()=>{
    const media=matchMedia('(prefers-color-scheme: dark)');
    function apply(){const dark=saved.preferences.theme==='dark'||saved.preferences.theme==='system'&&media.matches;document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.dataset.motion=saved.preferences.reducedMotion?'reduced':'full';document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#131d1a':'#f8f9fb');}
    apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);
  },[saved.preferences.theme,saved.preferences.reducedMotion]);
  useEffect(()=>{setManualShare(false);setNotice('');},[mode,answerId]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(timer);},[notice]);
  function practice(next=false){
    if(!saved.practice||next)setSaved(previous=>{
      const answer=choosePractice(countries.map(c=>c.iso3),daily.answer,previous.recentPractice);
      return {...previous,practice:{...blankProgress(),answer,id:`practice-${Date.now()}`},recentPractice:[...previous.recentPractice,answer].slice(-15)};
    });
    setMode('practice');
  }
  function guess(id:string){
    if(!countryById.has(id))return;
    setSaved(previous=>{
      if(mode==='daily'){const current=previous.daily[today]??blankProgress(),next=submitGuess(current,id,daily.answer);return next===current?previous:{...previous,daily:{...previous.daily,[today]:next}};}
      if(!previous.practice)return previous;
      const next=submitGuess(previous.practice,id,previous.practice.answer);
      return next===previous.practice?previous:{...previous,practice:{...previous.practice,...next}};
    });
  }
  const resultText=shareText(progress,answer,countryById,mode==='daily'?`#${daily.number}`:'Practice');
  async function copy(){try{await navigator.clipboard.writeText(resultText);setNotice('Results copied. Your answer stays a mystery.');}catch{setManualShare(true);}}
  async function share(){if(navigator.share){try{await navigator.share({text:resultText});}catch(e){if((e as Error).name!=='AbortError')await copy();}}else await copy();}
  const seconds=Math.max(0,Math.floor((Date.parse(today+'T00:00:00Z')+86400000-now.getTime())/1000));
  const countdown=`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}`;
  return <>
    <header className="site-header"><div className="header-inner"><a className="brand" href="/" aria-label="Debtle home"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span>debtle<span className="brand-dot">.</span></span></a><span className="header-tagline">A daily game of global connections</span><nav aria-label="Game tools"><button className="icon-button" onClick={()=>setDialog('help')} title="How to play" aria-label="How to play"><CircleHelp size={20}/></button><button className="icon-button" onClick={()=>setDialog('stats')} title="Statistics" aria-label="Statistics"><ChartNoAxesColumnIncreasing size={20}/></button><button className="icon-button" onClick={()=>setDialog('settings')} title="Settings" aria-label="Settings"><Settings2 size={20}/></button></nav></div></header>
    <main className="page-shell"><section className="game-intro"><div className="intro-kicker"><span/> A DIFFERENT WORLD VIEW</div><h1>Guess the country<br/><em>from its creditors.</em></h1><p>One mystery country. Its debt, mapped out. Six chances to connect the dots.</p></section>
      <div className="game-meta"><div className="mode-switch" aria-label="Game mode"><button className={mode==='daily'?'selected':''} aria-pressed={mode==='daily'} onClick={()=>setMode('daily')}><Globe2 size={15}/> Daily Challenge</button><button className={mode==='practice'?'selected':''} aria-pressed={mode==='practice'} onClick={()=>practice()}><Shuffle size={15}/> Practice</button></div><div className="puzzle-meta"><span>{mode==='daily'?`PUZZLE #${daily.number}`:'PRACTICE MODE'}</span><i/><span>2025 DATA</span></div></div>
      <Treemap country={answer} onInfo={()=>setDialog('info')}/>
      <section className="play-area" aria-label="Country guessing game"><div className="play-main">
        {complete?<div className={`result-panel ${progress.status}`} role="status">{progress.status==='won'&&<div className="celebration" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{'--i':i} as React.CSSProperties}/>)}</div>}<div className="result-eyebrow">{progress.status==='won'?<><Sparkles size={15}/> A WORLDLY CONNECTION</>:<>THE MAP REVEALED</>}</div><h2>{flag(answer.iso2)} {answer.name}</h2><p>{progress.status==='won'?`You found it in ${progress.guesses.length} of 6 guesses. Nicely connected.`:'Six guesses, a little more world knowledge. Your next discovery awaits.'}</p><div className="result-actions"><button className="primary-button" onClick={share}><Share2 size={17}/> Share results</button><button className="secondary-button" onClick={()=>practice(true)}>{mode==='practice'?'Next Country':'Try practice'}<ArrowRight size={17}/></button><button className="icon-button" onClick={copy} aria-label="Copy results" title="Copy results"><Copy size={18}/></button></div>{manualShare&&<div className="manual-share"><label htmlFor="share-result">Copy your result</label><textarea id="share-result" readOnly value={resultText} onFocus={e=>e.target.select()} rows={7}/></div>}{mode==='daily'&&<div className="next-puzzle"><Clock3 size={14}/> Next daily puzzle in {countdown} <span>· 00:00 UTC</span></div>}</div>:<><div className="attempt-heading"><div className="attempt-dots" aria-label={`${MAX_GUESSES-progress.guesses.length} guesses remaining`}>{Array.from({length:MAX_GUESSES},(_,i)=><i key={i} className={i<progress.guesses.length?'used':''}/>)}</div><span><strong>{MAX_GUESSES-progress.guesses.length}</strong> guesses remaining</span></div><CountrySearch key={`${mode}:${mode==='daily'?today:saved.practice?.id}`} guesses={progress.guesses} onGuess={guess}/><GuessHistory guesses={progress.guesses} answer={answer} unit={saved.preferences.unit}/></>}
        {complete&&<GuessHistory guesses={progress.guesses} answer={answer} unit={saved.preferences.unit}/>}
      </div><aside className="play-aside"><span className="aside-icon"><Globe2 size={23}/></span><h2>A country’s connections,<br/>hidden in plain sight.</h2><p>Each rectangle is a creditor. Its size tells you how much of the debt they hold.</p><button className="text-link" onClick={()=>setDialog('help')}>New here? Here’s how to play <ArrowRight size={14}/></button>{mode==='practice'&&<button className="skip-practice" onClick={()=>practice(true)}><Shuffle size={14}/> Next Country</button>}<div className="aside-note"><Check size={13}/><span>Real World Bank data.<br/>A fresh perspective every day.</span></div></aside></section>
      {complete&&<CountryProfile country={answer}/>}
      {!storageOk&&<p className="storage-warning" role="alert">Browser storage is unavailable. You can play, but progress will not survive a reload.</p>}
      <footer className="site-footer"><div><span className="footer-mark">d.</span><p>A little geography. A lot of connections.</p></div><div><button onClick={()=>setDialog('info')}>Data & methodology <InfoIcon size={13}/></button><a href="https://www.worldbank.org/en/programs/debt-statistics/ids" target="_blank" rel="noreferrer">World Bank IDS <ExternalLink size={12}/></a><a href="/downloads/">Project files <ExternalLink size={12}/></a></div><span className="footer-fine">PPG external debt + IMF credit · 2025 · Current US$</span></footer>
    </main>
    {notice&&<div className="toast" role="status"><Check size={16}/>{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notification"><X size={15}/></button></div>}
    {dialog&&<Modal title={{help:'How to play',stats:'Your statistics',settings:'Your preferences',info:'The data behind Debtle'}[dialog]} onClose={()=>setDialog(null)}>{dialog==='help'?<HowToPlay/>:dialog==='stats'?<Statistics daily={saved.daily} today={today}/>:dialog==='settings'?<Settings preferences={saved.preferences} onChange={preferences=>setSaved(previous=>({...previous,preferences}))}/>:<Info/>}</Modal>}
  </>;
}
