import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import { Info, MousePointer2, X } from 'lucide-react';
import type { Country, Creditor } from '../types';
import { categories, money, percent } from '../data';

interface Node { name:string; value?:number; creditor?:Creditor; children?:Node[] }
function wrap(name:string,width:number,font:number,maxLines:number) {
  const capacity=Math.max(1,Math.floor(width/(font*.57))),lines:string[]=[];
  let line='';
  for(const word of name.split(' ')) {
    if((line+' '+word).trim().length>capacity&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();
  }
  if(line)lines.push(line);
  return lines.slice(0,maxLines).map((text,i)=>text.length>capacity||i===maxLines-1&&lines.length>maxLines?text.slice(0,capacity-1)+'…':text);
}
export default function Treemap({country,onInfo}:{country:Country;onInfo:()=>void}) {
  const host=useRef<HTMLDivElement>(null),id=useId().replaceAll(':','');
  const [width,setWidth]=useState(960),[active,setActive]=useState<{creditor:Creditor;x:number;y:number}|null>(null),[pinned,setPinned]=useState(false);
  const height=width<580?350:360;
  useEffect(()=>{if(!host.current)return;const observer=new ResizeObserver(([entry])=>setWidth(Math.max(240,entry.contentRect.width)));observer.observe(host.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{setActive(null);setPinned(false);},[country.iso3]);
  useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setActive(null);setPinned(false);}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
  const leaves=useMemo(()=>{
    const root=hierarchy<Node>({name:'Creditor composition',children:country.creditors.filter(c=>c.value>0).map(c=>({name:c.name,value:c.value,creditor:c}))}).sum(d=>d.value||0).sort((a,b)=>(b.value||0)-(a.value||0));
    return treemap<Node>().tile(treemapSquarify.ratio(1.25)).size([width,height]).paddingInner(3).round(true)(root).leaves();
  },[country,width,height]);
  return <section className="map-card" aria-label="Mystery country creditor treemap">
    <div className="map-toolbar map-toolbar-with-total"><div className="map-debt-total"><span className="eyebrow">OUTSTANDING EXTERNAL DEBT</span><strong>{money(country.totalDebt)}</strong><small>PPG debt + IMF credit · current US$</small></div><span className="map-hint"><MousePointer2 size={13}/><span>Hover or tap to explore</span></span><button className="icon-button mini" onClick={onInfo} aria-label="About the debt data"><Info size={17}/></button></div>
    <div className="map-stage" ref={host} onPointerLeave={()=>{if(!pinned)setActive(null);}}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="group" aria-label="Creditors sized by their share of PPG external debt plus IMF credit">
        <defs>{leaves.map((node,i)=><clipPath key={i} id={`${id}-${i}`}><rect x={node.x0+7} y={node.y0+6} width={Math.max(0,node.x1-node.x0-14)} height={Math.max(0,node.y1-node.y0-12)}/></clipPath>)}</defs>
        {leaves.map((node,i)=>{
          const c=node.data.creditor!,w=node.x1-node.x0,h=node.y1-node.y0;
          const font=w>220&&h>130?20:w>140&&h>80?16:12;
          const show=w>67&&h>43,showName=w>82&&h>65;
          const lines=showName?wrap(c.name,w-24,font,Math.max(1,Math.min(3,Math.floor((h-40)/(font*1.2))))):[];
          const select=()=>{setActive({creditor:c,x:(node.x0+node.x1)/2,y:node.y0});setPinned(true);};
          return <g key={c.id} role="button" tabIndex={0} aria-label={`${c.name}, ${categories[c.type].name}, ${money(c.value)}, ${percent(c.share)}`} onPointerEnter={()=>{if(!pinned)setActive({creditor:c,x:(node.x0+node.x1)/2,y:node.y0});}} onFocus={()=>setActive({creditor:c,x:(node.x0+node.x1)/2,y:node.y0})} onBlur={()=>{if(!pinned)setActive(null);}} onClick={()=>{if(pinned&&active?.creditor.id===c.id){setPinned(false);setActive(null);}else select();}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}}} className={`map-tile ${active?.creditor.id===c.id?'is-active':''}`}>
            <rect x={node.x0} y={node.y0} width={w} height={h} rx={2} fill={categories[c.type].color}/>
            {show&&<text clipPath={`url(#${id}-${i})`} x={node.x0+14} y={node.y0+font+12} fill={categories[c.type].text} fontSize={font} fontWeight="600">{lines.map((line,j)=><tspan key={j} x={node.x0+14} dy={j===0?0:font*1.2}>{line}</tspan>)}<tspan x={node.x0+14} dy={lines.length?font*1.6:0} fontSize={lines.length?font*.86:font} fontWeight="400" opacity=".92">{percent(c.share)}</tspan></text>}
          </g>;
        })}
      </svg>
      {active&&<div className="map-tooltip" role="status" style={{left:Math.max(8,Math.min(width-254,active.x-120)),top:Math.max(8,Math.min(height-142,active.y+16))}}><div className="tooltip-heading"><strong>{active.creditor.name}</strong><button aria-label="Close creditor detail" onClick={()=>{setActive(null);setPinned(false);}}><X size={14}/></button></div><span className="tooltip-category"><i style={{background:categories[active.creditor.type].color}}/>{categories[active.creditor.type].name}</span><div className="tooltip-value">{money(active.creditor.value)}<b>{percent(active.creditor.share)}</b></div><small>of total game debt · current US$</small></div>}
    </div>
    <div className="map-legend" aria-label="Creditor categories">{Object.entries(categories).map(([key,c])=><span key={key} title={c.label}><i style={{background:c.color}}/>{c.name}</span>)}<small>Rectangle area = share of debt</small></div>
  </section>;
}
