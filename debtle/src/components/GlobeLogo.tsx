import { useId } from 'react';

/** Treemap tiles clipped to a globe silhouette. Gaps remain transparent. */
export default function GlobeLogo({size=29,className}:{size?:number;className?:string}) {
  const clip=useId().replaceAll(':','')+'-globe';
  return <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <defs><clipPath id={clip}><circle cx="16" cy="16" r="15.5"/></clipPath></defs>
    <g clipPath={`url(#${clip})`}>
      <rect x="0" y="0" width="17" height="10" fill="#205b48"/>
      <rect x="19" y="0" width="13" height="10" fill="#428575"/>
      <rect x="0" y="12" width="8" height="12" fill="#428575"/>
      <rect x="10" y="12" width="13" height="7" fill="#28624f"/>
      <rect x="25" y="12" width="7" height="7" fill="#80aea5"/>
      <rect x="10" y="21" width="7" height="11" fill="#164735"/>
      <rect x="19" y="21" width="13" height="6" fill="#428575"/>
      <rect x="0" y="26" width="8" height="6" fill="#80aea5"/>
      <rect x="19" y="29" width="13" height="3" fill="#205b48"/>
    </g>
  </svg>;
}
