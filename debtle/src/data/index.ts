import raw from './debt.json';
import type { Country, CreditorType } from '../types';
export const countries = (raw.countries as Country[]).toSorted((a,b)=>a.name.localeCompare(b.name));
export const countryById = new Map(countries.map(c=>[c.iso3,c]));
export const source = raw.source;
export const categories:Record<CreditorType,{name:string;label:string;color:string;text:string}> = {
  bilateral:{name:'Bilateral',label:'Creditor countries',color:'#3e72a9',text:'#ffffff'},
  multilateral:{name:'Multilateral',label:'International institutions',color:'#297b68',text:'#ffffff'},
  private:{name:'Private',label:'Bondholders & private lenders',color:'#dfa06d',text:'#382516'},
  imf:{name:'IMF',label:'International Monetary Fund',color:'#ae95cc',text:'#30203e'},
  other:{name:'Other',label:'Other & unallocated balances',color:'#a0a8b3',text:'#25303a'}
};
export function flag(iso2:string) { return iso2==='XK'?'🇽🇰':iso2.toUpperCase().replace(/./g,c=>String.fromCodePoint(c.charCodeAt(0)+127397)); }
export function money(value:number) {
  if (value>=1e12)return `$${(value/1e12).toLocaleString('en-US',{maximumFractionDigits:2})} trillion`;
  if (value>=1e9)return `$${(value/1e9).toLocaleString('en-US',{maximumFractionDigits:2})} billion`;
  if (value>=1e6)return `$${(value/1e6).toLocaleString('en-US',{maximumFractionDigits:2})} million`;
  return value.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
}
export const percent = (n:number) => n>0&&n<0.1?'<0.1%':`${n.toFixed(1)}%`;
