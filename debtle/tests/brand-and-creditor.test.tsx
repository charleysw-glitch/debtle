import { readFileSync } from 'node:fs';
import { render,screen,fireEvent } from '@testing-library/react';
import { describe,it,expect } from 'vitest';
import BrandLogo from '../src/components/BrandLogo';
import GlobeLogo from '../src/components/GlobeLogo';
import Treemap from '../src/components/Treemap';
import { DEFAULT_LOGO_VARIANT,logoVariant } from '../src/config/brand';
import { countryById } from '../src/data';
import { MULTIPLE_LENDERS_DESCRIPTION } from '../src/data/creditor-info';

describe('preserved and alternative brand marks',()=>{
  it('retains the original as default and supports explicit header preview',()=>{
    expect(DEFAULT_LOGO_VARIANT).toBe('original');expect(logoVariant('')).toBe('original');expect(logoVariant('?logo=globe')).toBe('globe');expect(logoVariant('?logo=original')).toBe('original');expect(logoVariant('?logo=unknown')).toBe('original');
    const original=render(<BrandLogo variant="original"/>);expect(original.container.querySelectorAll('.brand-mark i')).toHaveLength(3);expect(original.container.querySelector('svg')).toBeNull();
    original.rerender(<BrandLogo variant="globe"/>);expect(original.container.querySelectorAll('svg rect')).toHaveLength(9);expect(original.container.querySelector('svg circle')).toHaveAttribute('r','15.5');
  });
  it('matches the standalone SVG and favicon to the reusable component geometry',()=>{
    const view=render(<GlobeLogo/>);const attributes=['x','y','width','height','fill'];
    const geometry=(rects:NodeListOf<Element>)=>Array.from(rects,r=>attributes.map(a=>r.getAttribute(a)));
    const component=geometry(view.container.querySelectorAll('rect'));
    for(const file of ['logo-globe.svg','favicon-globe.svg']){
      const svg=new DOMParser().parseFromString(readFileSync(new URL('../public/'+file,import.meta.url),'utf8'),'image/svg+xml');
      expect(svg.querySelector('parsererror')).toBeNull();expect(geometry(svg.querySelectorAll('rect'))).toEqual(component);
    }
    const two=render(<><GlobeLogo/><GlobeLogo/></>);const ids=Array.from(two.container.querySelectorAll('clipPath'),p=>p.id);expect(new Set(ids).size).toBe(2);
  });
  it('updates the favicon only to the selected variant',()=>{
    const icon=document.createElement('link');icon.rel='icon';icon.href='/favicon.svg';document.head.append(icon);
    const view=render(<BrandLogo variant="globe"/>);expect(icon.getAttribute('href')).toBe('/favicon-globe.svg');view.rerender(<BrandLogo variant="original"/>);expect(icon.getAttribute('href')).toBe('/favicon.svg');icon.remove();
  });
});
describe('Multiple Lenders explanations',()=>{
  it.each([['CAF','Official bilateral'],['ZMB','Official multilateral'],['AGO','Non-official (private)'],['BLZ','Not verified']])('explains the actual classification for %s',(iso,type)=>{
    const view=render(<Treemap country={countryById.get(iso)!} onInfo={()=>{}}/>);
    const tile=Array.from(view.container.querySelectorAll('g[role="button"]')).find(g=>g.getAttribute('aria-label')?.startsWith('Multiple Lenders,'))!;
    fireEvent.click(tile);const tooltip=screen.getByRole('status');expect(tooltip).toHaveTextContent(MULTIPLE_LENDERS_DESCRIPTION);expect(tooltip).toHaveTextContent('Creditor type: '+type);expect(tooltip).not.toHaveTextContent('syndicated');
  });
});
