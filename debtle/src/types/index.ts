export type CreditorType = 'bilateral' | 'multilateral' | 'private' | 'imf' | 'other';
export interface Creditor { id:string; code:string; name:string; type:CreditorType; value:number; share:number }
export interface Country { iso3:string; iso2:string; name:string; sourceName:string; aliases:string[]; year:number; centroid:{lat:number;lon:number}; ppgTotal:number; imfCredit:number; totalDebt:number; unallocatedDebt:number; validationStatus:string; warnings:string[]; creditors:Creditor[] }
export type GameStatus = 'playing' | 'won' | 'lost';
export interface Progress { guesses:string[]; status:GameStatus }
export interface PracticeProgress extends Progress { answer:string; id:string }
export interface Preferences { theme:'light'|'dark'|'system'; unit:'km'|'mi'; reducedMotion:boolean }
export interface SavedState { version:1; daily:Record<string,Progress>; practice:PracticeProgress|null; recentPractice:string[]; preferences:Preferences }
export type Mode = 'daily'|'practice';
