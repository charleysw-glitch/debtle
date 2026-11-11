import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Search, X } from 'lucide-react';
import { countries } from '../data';
import { normalize,searchCountries } from '../game/rules';
import type { Country } from '../types';
export default function CountrySearch({guesses,onGuess}:{guesses:string[];onGuess:(id:string)=>void}) {
  const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[active,setActive]=useState(0),[selected,setSelected]=useState<Country|null>(null),[error,setError]=useState('');
  const id=useId(),root=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null);
  const results=searchCountries(countries,query,guesses),visible=results.slice(0,120);
  useEffect(()=>{function close(e:PointerEvent){if(root.current&&!root.current.contains(e.target as Node))setOpen(false);}document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
  useEffect(()=>{if(open)document.getElementById(`${id}-${active}`)?.scrollIntoView?.({block:'nearest'});},[active,open,id]);
  function choose(c:Country){setSelected(c);setQuery(c.name);setOpen(false);setError('');input.current?.focus();}
  function submit(){
    const exact=selected??results.find(c=>[c.name,...c.aliases].some(n=>normalize(n)===normalize(query)));
    if(!exact){setOpen(true);setError('Choose a country from the list.');return;}
    onGuess(exact.iso3);setQuery('');setSelected(null);setOpen(false);setActive(0);setError('');input.current?.focus();
  }
  return <div ref={root} className="country-search">
    <label htmlFor={`${id}-input`}>Which country is it?</label>
    <form onSubmit={e=>{e.preventDefault();submit();}}>
      <div className={`search-field ${open?'is-open':''}`}><Search size={19} aria-hidden="true"/><input ref={input} id={`${id}-input`} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open&&visible[active]?`${id}-${active}`:undefined} autoComplete="off" placeholder="Search for a country…" value={query} onFocus={()=>setOpen(true)} onChange={e=>{setQuery(e.target.value);setSelected(null);setActive(0);setOpen(true);setError('');}} onKeyDown={e=>{
        if(e.key==='Escape'){setOpen(false);e.stopPropagation();}
        if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setActive(a=>Math.min(a+1,visible.length-1));}
        if(e.key==='ArrowUp'){e.preventDefault();setOpen(true);setActive(a=>Math.max(a-1,0));}
        if(e.key==='Enter'&&open&&visible[active]){e.preventDefault();choose(visible[active]);}
      }}/>{query?<button type="button" aria-label="Clear country search" onClick={()=>{setQuery('');setSelected(null);setActive(0);input.current?.focus();}}><X size={16}/></button>:<ChevronDown size={16} aria-hidden="true"/>}</div>
      <button className="primary-button guess-button" type="submit" disabled={!query.trim()}>Guess <ArrowRight size={18}/></button>
    </form>
    {open&&<div className="country-options" id={`${id}-options`} role="listbox" aria-label="Eligible debtor countries">
      <div className="options-caption">{results.length} {query?'matching':'eligible'} {results.length===1?'country':'countries'}</div>
      {visible.length?visible.map((c,i)=><div key={c.iso3} id={`${id}-${i}`} role="option" aria-selected={i===active} className={`country-option ${i===active?'highlighted':''}`} onPointerMove={()=>setActive(i)} onPointerDown={e=>{e.preventDefault();choose(c);}}><span>{c.name}</span><small>{c.iso3}</small></div>):<p className="empty-search">No matches. Try a country name or ISO code. Previously guessed countries are hidden.</p>}
    </div>}
    {error&&<p className="field-error" role="alert">{error}</p>}
  </div>;
}
