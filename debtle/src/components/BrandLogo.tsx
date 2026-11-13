import { useEffect } from 'react';
import type { LogoVariant } from '../config/brand';
import GlobeLogo from './GlobeLogo';

export default function BrandLogo({variant}:{variant:LogoVariant}) {
  useEffect(()=>{
    document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href',variant==='globe'?'/favicon-globe.svg':'/favicon.svg');
  },[variant]);
  return variant==='globe'?<GlobeLogo className="brand-globe"/>:<span className="brand-mark" aria-hidden="true"><i/><i/><i/></span>;
}
