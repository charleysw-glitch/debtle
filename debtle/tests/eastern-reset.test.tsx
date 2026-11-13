import { afterEach,describe,it,expect,vi } from 'vitest';
import { act,fireEvent,render,renderHook,screen } from '@testing-library/react';
import { addCalendarDays,dailyCountdown,dailyPuzzle,nextDailyReset,puzzleDate } from '../src/game/daily';
import { usePuzzleClock } from '../src/game/usePuzzleClock';
import { emptyState,loadState,saveState,statistics } from '../src/game/storage';
import App from '../src/App';

afterEach(()=>vi.useRealTimers());
describe('common Eastern puzzle date',()=>{
  it.each([
    ['2026-11-14T04:30:00Z','2026-11-13',13],
    ['2026-11-14T04:59:59.999Z','2026-11-13',13],
    ['2026-11-14T05:00:00Z','2026-11-14',14],
    ['2027-07-15T03:59:59.999Z','2027-07-14',256],
    ['2027-07-15T04:00:00Z','2027-07-15',257],
  ])('selects by Eastern calendar at %s',(instant,date,number)=>{
    expect(puzzleDate(new Date(instant))).toBe(date);
    expect(dailyPuzzle(date).number).toBe(number);
  });
  it('gives players in Tokyo, London and California the same answer at the same instant',()=>{
    const instants=['2026-11-14T13:30:00+09:00','2026-11-14T04:30:00Z','2026-11-13T20:30:00-08:00'];
    const dates=instants.map(s=>puzzleDate(new Date(s)));
    expect(dates).toEqual(Array(3).fill('2026-11-13'));
    expect(new Set(dates.map(d=>dailyPuzzle(d).answer)).size).toBe(1);
  });
  it('preserves the existing numbered schedule',()=>{
    expect(dailyPuzzle('2026-11-01')).toMatchObject({number:1,answer:'BGD'});
    expect(dailyPuzzle('2026-11-11')).toMatchObject({number:11,answer:'BLZ'});
    expect(dailyPuzzle('2027-03-01').answer).toBe('KEN');
  });
});
describe('next midnight and countdown',()=>{
  it.each([
    ['2026-11-14T04:30:00Z','2026-11-14T05:00:00.000Z','00:30'],
    ['2026-07-15T03:30:00Z','2026-07-15T04:00:00.000Z','00:30'],
    ['2026-03-08T05:00:00Z','2026-03-09T04:00:00.000Z','23:00'],
    ['2026-11-01T04:00:00Z','2026-11-02T05:00:00.000Z','25:00'],
    ['2026-11-14T04:59:59.500Z','2026-11-14T05:00:00.000Z','00:01'],
  ])('uses IANA DST rules at %s',(now,next,label)=>{
    expect(nextDailyReset(new Date(now)).toISOString()).toBe(next);
    expect(dailyCountdown(new Date(now))).toBe(label);
  });
  it('does not reset at the skipped or repeated DST hour',()=>{
    for(const instant of ['2026-03-08T06:59:59Z','2026-03-08T07:00:00Z'])expect(puzzleDate(new Date(instant))).toBe('2026-03-08');
    for(const instant of ['2026-11-01T05:30:00Z','2026-11-01T06:30:00Z'])expect(nextDailyReset(new Date(instant)).toISOString()).toBe('2026-11-02T05:00:00.000Z');
    expect(addCalendarDays('2026-03-08',1)).toBe('2026-03-09');
  });
});
describe('migration and open tabs',()=>{
  it('preserves UTC-era results, unfinished guesses, preferences and practice verbatim',()=>{
    const legacy=emptyState();legacy.daily={'2026-11-13':{guesses:['GHA'],status:'playing'},'2026-11-14':{guesses:['KEN','BLZ'],status:'won'}};
    legacy.practice={answer:'GHA',id:'legacy',guesses:['KEN'],status:'playing'};legacy.preferences.theme='dark';saveState(legacy);
    const loaded=loadState();expect(loaded).toEqual(legacy);
    expect(statistics(loaded.daily,'2026-11-13').played).toBe(1);
    expect(statistics(loaded.daily,'2026-11-14').wins).toBe(1);
  });
  it('switches an open Daily Challenge at midnight without refresh, retaining the completed result',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-14T04:59:59Z'));
    const saved=emptyState();saved.daily['2026-11-13']={guesses:[dailyPuzzle('2026-11-13').answer],status:'won'};saveState(saved);
    render(<App/>);expect(screen.getByText('PUZZLE #13')).toBeInTheDocument();expect(screen.getByText(/12:00 AM ET/)).toBeInTheDocument();
    act(()=>vi.advanceTimersByTime(1030));
    expect(screen.getByText('PUZZLE #14')).toBeInTheDocument();expect(screen.getByRole('combobox')).toBeInTheDocument();expect(loadState().daily['2026-11-13'].status).toBe('won');
  });
  it('keeps a UTC-era preplayed next puzzle locked after the Eastern reset',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-14T04:59:59Z'));
    const saved=emptyState();saved.daily['2026-11-14']={guesses:[dailyPuzzle('2026-11-14').answer],status:'won'};saveState(saved);
    render(<App/>);act(()=>vi.advanceTimersByTime(1030));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();expect(loadState().daily['2026-11-14'].guesses).toHaveLength(1);
  });
  it('catches up after suspension, focus and back-forward cache restoration',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-14T04:30:00Z'));
    const {result}=renderHook(()=>usePuzzleClock());expect(puzzleDate(result.current)).toBe('2026-11-13');
    vi.setSystemTime(new Date('2026-11-14T06:00:00Z'));act(()=>fireEvent(document,new Event('visibilitychange')));expect(puzzleDate(result.current)).toBe('2026-11-14');
    vi.setSystemTime(new Date('2026-11-15T06:00:00Z'));act(()=>window.dispatchEvent(new Event('pageshow')));expect(puzzleDate(result.current)).toBe('2026-11-15');
    vi.setSystemTime(new Date('2026-11-16T06:00:00Z'));act(()=>window.dispatchEvent(new Event('focus')));expect(puzzleDate(result.current)).toBe('2026-11-16');
  });
  it('does not change an active practice puzzle at the daily reset',()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-14T04:59:59Z'));
    const saved=emptyState();saved.practice={answer:'GHA',id:'practice-kept',guesses:['KEN'],status:'playing'};saveState(saved);
    render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Practice'}));
    act(()=>vi.advanceTimersByTime(1030));expect(loadState().practice).toEqual(saved.practice);expect(screen.getByText('PRACTICE MODE')).toBeInTheDocument();
  });
});
