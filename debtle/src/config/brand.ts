export type LogoVariant='original'|'globe';
/** Keep the original by default. Set to 'globe' to adopt the alternative. */
export const DEFAULT_LOGO_VARIANT:LogoVariant='original';
/** Preview in the existing header with /?logo=globe or /?logo=original. */
export function logoVariant(search:string):LogoVariant {
  const preview=new URLSearchParams(search).get('logo');
  return preview==='original'||preview==='globe'?preview:DEFAULT_LOGO_VARIANT;
}
