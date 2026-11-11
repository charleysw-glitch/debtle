import { describe,it,expect } from 'vitest';
import { countries,countryById } from '../src/data';
import { dailyPuzzle,choosePractice,shuffledPool } from '../src/game/daily';
import { blankProgress,searchCountries,submitGuess } from '../src/game/rules';
import { bearing,direction,distanceKm,proximity } from '../src/game/geography';
import { emptyState,loadState,saveState,statistics,STORAGE_KEY } from '../src/game/storage';
import { shareText } from '../src/game/share';

describe('geographic calculations',()=>{
  it('calculates known great-circle distances',()=>{
    expect(distanceKm({lat:0,lon:0},{lat:0,lon:90})).toBeCloseTo(10007.557,2);
    expect(distanceKm({lat:51.5074,lon:-0.1278},{lat:40.7128,lon:-74.006})).toBeCloseTo(5570.23,0);
    expect(distanceKm({lat:0,lon:0},{lat:0,lon:0})).toBe(0);
    expect(distanceKm({lat:0,lon:0},{lat:0,lon:180})).toBeCloseTo(20015.114,2);
    expect(distanceKm({lat:0,lon:179},{lat:0,lon:-179})).toBeCloseTo(222.39,1);
  });
  it('calculates bearings from guess toward answer',()=>{
    expect(bearing({lat:0,lon:0},{lat:10,lon:0})).toBe(0);
    expect(bearing({lat:0,lon:0},{lat:0,lon:10})).toBe(90);
    expect(bearing({lat:0,lon:0},{lat:-10,lon:0})).toBe(180);
    expect(bearing({lat:0,lon:0},{lat:0,lon:-10})).toBe(270);
    expect(bearing({lat:0,lon:0},{lat:0,lon:0})).toBeNull();
    expect(direction(135).arrow).toBe('↘');
    expect(direction(359).name).toBe('North');
    expect(proximity(500)).toBe(5);expect(proximity(1500)).toBe(4);expect(proximity(4500)).toBe(3);expect(proximity(9000)).toBe(2);expect(proximity(15000)).toBe(1);
  });
});
describe('country search',()=>{
  it.each([['DRC','COD'],['Ivory Coast','CIV'],['Turkey','TUR'],['Turkiye','TUR'],['Türkiye','TUR'],['Cote dIvoire','CIV'],['Burma','MMR'],['Cape Verde','CPV'],['East Timor','TLS'],['Lao PDR','LAO']])('finds %s', (query,id)=>expect(searchCountries(countries,query)[0].iso3).toBe(id));
  it('excludes prior guesses and aggregate groups',()=>{
    expect(searchCountries(countries,'Ghana',['GHA'])).toHaveLength(0);
    expect(searchCountries(countries,'Least developed')).toHaveLength(0);
  });
});
describe('daily selection',()=>{
  it('is deterministic for a UTC date',()=>{
    expect(dailyPuzzle('2026-11-11')).toEqual(dailyPuzzle('2026-11-11'));
    expect(dailyPuzzle('2026-11-11').number).toBe(11);
    expect(dailyPuzzle('2026-11-01').number).toBe(1);
  });
  it('never repeats until every country has appeared',()=>{
    const answers=Array.from({length:120},(_,i)=>dailyPuzzle(new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10)).answer);
    expect(new Set(answers).size).toBe(120);
    expect(answers.toSorted()).toEqual(countries.map(c=>c.iso3).toSorted());
    expect(new Set(shuffledPool(1)).size).toBe(120);
  });
  it('freezes published answers',()=>{
    // Snapshot pins the data-versioned schedule independently of dataset order.
    expect(['2026-11-01','2026-11-11','2027-03-01'].map(date=>dailyPuzzle(date).answer)).toMatchInlineSnapshot(`
      [
        "BGD",
        "BLZ",
        "KEN",
      ]
    `);
  });
});
describe('game rules',()=>{
  it('wins only for the answer and cannot replay a win',()=>{
    const incorrect=submitGuess(blankProgress(),'GHA','KEN');expect(incorrect.status).toBe('playing');
    const won=submitGuess(incorrect,'KEN','KEN');expect(won.status).toBe('won');expect(won.guesses).toEqual(['GHA','KEN']);expect(submitGuess(won,'ZMB','KEN')).toBe(won);
  });
  it('has six attempts, rejects duplicates and locks losses',()=>{
    let p=submitGuess(blankProgress(),'GHA','KEN');expect(submitGuess(p,'GHA','KEN')).toBe(p);
    for(const id of ['ZMB','KHM','BOL','SRB','ARG'])p=submitGuess(p,id,'KEN');
    expect(p.status).toBe('lost');expect(p.guesses).toHaveLength(6);expect(submitGuess(p,'KEN','KEN')).toBe(p);
  });
  it('excludes daily and recent practice answers, with safe fallback',()=>{
    expect(choosePractice(['GHA','KEN','ZMB'],'GHA',['KEN'],()=>0)).toBe('ZMB');
    expect(choosePractice(['GHA','KEN'],'GHA',['KEN'],()=>0)).toBe('KEN');
  });
});
describe('persistence and statistics',()=>{
  it('resumes guesses and preferences across a reload',()=>{
    const state=emptyState();state.daily['2026-11-11']={guesses:['GHA'],status:'playing'};state.preferences.theme='dark';
    expect(saveState(state)).toBe(true);expect(loadState()).toEqual(state);
  });
  it('recovers from broken, invalid, or unavailable storage',()=>{
    localStorage.setItem(STORAGE_KEY,'{broken');expect(loadState()).toEqual(emptyState());
    localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,daily:{'2026-11-11':{guesses:['WAT'],status:'won'}}}));expect(loadState().daily).toEqual({});
    expect(saveState(emptyState(),{setItem(){throw new Error('Quota');}})).toBe(false);
    expect(loadState({getItem(){throw new Error('Blocked');}})).toEqual(emptyState());
  });
  it('counts daily completions exactly once, tracks missing days and losses',()=>{
    const daily={'2026-11-08':{guesses:['GHA'],status:'won' as const},'2026-11-09':{guesses:['KEN'],status:'won' as const},'2026-11-11':{guesses:['ZMB','KEN'],status:'won' as const}};
    const stats=statistics(daily,'2026-11-11');expect(stats.played).toBe(3);expect(stats.wins).toBe(3);expect(stats.currentStreak).toBe(1);expect(stats.maxStreak).toBe(2);expect(stats.distribution).toEqual([2,1,0,0,0,0]);
    expect(statistics(daily,'2026-11-12').currentStreak).toBe(1);expect(statistics(daily,'2026-11-13').currentStreak).toBe(0);
    expect(statistics({...daily,'2026-11-12':{guesses:['GHA','KEN','ZMB','KHM','BOL','SRB'],status:'lost'}},'2026-11-12').currentStreak).toBe(0);
  });
  it('practice is saved separately from daily statistics',()=>{
    const state=emptyState();state.practice={answer:'GHA',id:'practice-1',guesses:['GHA'],status:'won'};state.recentPractice=['GHA'];saveState(state);expect(loadState().practice).toEqual(state.practice);expect(statistics(loadState().daily).played).toBe(0);
  });
  it('share text does not reveal the answer or guessed countries',()=>{
    const answer=countryById.get('KEN')!;const text=shareText({guesses:['GHA','KEN'],status:'won'},answer,countryById,'#11');
    expect(text).toContain('Solved in 2/6');expect(text).not.toContain('Kenya');expect(text).not.toContain('Ghana');expect(text).toContain('🟩');
  });
});
