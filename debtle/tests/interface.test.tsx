import { fireEvent,render,screen,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe,it,expect,vi } from 'vitest';
import App from '../src/App';
import CountrySearch from '../src/components/CountrySearch';
import Treemap from '../src/components/Treemap';
import { countryById } from '../src/data';
import { dailyPuzzle,puzzleDate } from '../src/game/daily';
import { loadState,emptyState,saveState } from '../src/game/storage';

describe('interactive interface',()=>{
  it('supports keyboard search, selection and submission',async()=>{
    const user=userEvent.setup(),onGuess=vi.fn();render(<CountrySearch guesses={[]} onGuess={onGuess}/>);
    const input=screen.getByRole('combobox');await user.type(input,'Ivory Coast');expect(screen.getByRole('option',{name:/Côte d’Ivoire/})).toBeInTheDocument();
    await user.keyboard('{Enter}');expect(input).toHaveValue('Côte d’Ivoire');await user.click(screen.getByRole('button',{name:'Guess'}));expect(onGuess).toHaveBeenCalledWith('CIV');expect(input).toHaveValue('');
    await user.click(input);await user.keyboard('{ArrowDown}');expect(input.getAttribute('aria-activedescendant')).toBeTruthy();await user.keyboard('{Escape}');expect(input).toHaveAttribute('aria-expanded','false');
  });
  it('keeps small creditor rectangles and exposes an accessible tooltip',async()=>{
    const user=userEvent.setup(),c=countryById.get('GHA')!;render(<Treemap country={c} onInfo={()=>{}}/>);
    const group=screen.getByRole('group');const tiles=within(group).getAllByRole('button');expect(tiles).toHaveLength(c.creditors.filter(x=>x.value>0).length);
    fireEvent.pointerEnter(tiles[0]);expect(screen.getByRole('status')).toHaveTextContent(c.creditors[0].name);expect(screen.getByRole('status')).toHaveTextContent('current US$');await user.click(tiles[0]);fireEvent.pointerLeave(group.parentElement!);expect(screen.getByRole('status')).toBeInTheDocument();await user.keyboard('{Escape}');expect(screen.queryByRole('status')).not.toBeInTheDocument();
    for(const text of group.querySelectorAll('text'))expect(text).toHaveAttribute('clip-path');
  });
  it('does not reveal the answer before completion and persists guesses',async()=>{
    const user=userEvent.setup(),answer=dailyPuzzle().answer;render(<App/>);
    const wrong=answer==='GHA'?'KEN':'GHA';const input=screen.getByRole('combobox');await user.type(input,countryById.get(wrong)!.name);await user.keyboard('{Enter}');await user.click(screen.getByRole('button',{name:'Guess'}));expect(loadState().daily[puzzleDate()].guesses).toEqual([wrong]);expect(screen.getByRole('combobox')).toBeInTheDocument();expect(screen.queryByRole('heading',{name:new RegExp(countryById.get(answer)!.name)})).not.toBeInTheDocument();
  });
  it('reveals a win, freezes the daily result, and opens the detailed profile',async()=>{
    const user=userEvent.setup(),answer=countryById.get(dailyPuzzle().answer)!;render(<App/>);
    await user.type(screen.getByRole('combobox'),answer.name);await user.keyboard('{Enter}');await user.click(screen.getByRole('button',{name:'Guess'}));expect(screen.queryByRole('combobox')).not.toBeInTheDocument();expect(screen.getByText('You got it in 1 of 6 guesses. Well done!')).toBeInTheDocument();expect(loadState().daily[puzzleDate()].status).toBe('won');expect(screen.getByText('Five largest creditors')).toBeInTheDocument();await user.click(screen.getByText(/View all \d+ creditors/));expect(screen.getByRole('table')).toBeVisible();
  });
  it('handles a sixth incorrect guess, loss reveal, and reloaded completion',async()=>{
    const user=userEvent.setup(),answer=dailyPuzzle().answer;
    const wrong=[...countryById.values()].filter(c=>c.iso3!==answer).slice(0,6);
    const saved=emptyState();saved.daily[puzzleDate()]={guesses:wrong.slice(0,5).map(c=>c.iso3),status:'playing'};saveState(saved);
    const view=render(<App/>);await user.type(screen.getByRole('combobox'),wrong[5].name);await user.keyboard('{Enter}');await user.click(screen.getByRole('button',{name:'Guess'}));
    expect(screen.getByText('THE MAP REVEALED')).toBeInTheDocument();expect(loadState().daily[puzzleDate()].status).toBe('lost');expect(screen.queryByRole('combobox')).not.toBeInTheDocument();view.unmount();render(<App/>);expect(screen.getByText('THE MAP REVEALED')).toBeInTheDocument();expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
  it('opens settings and applies dark mode and miles',async()=>{
    const user=userEvent.setup();render(<App/>);await user.click(screen.getByRole('button',{name:'Settings'}));const dialog=screen.getByRole('dialog');await user.click(within(dialog).getByRole('button',{name:'Dark'}));expect(document.documentElement.dataset.theme).toBe('dark');await user.click(within(dialog).getByRole('button',{name:'Miles'}));expect(loadState().preferences.unit).toBe('mi');await user.click(within(dialog).getByRole('button',{name:'Close dialog'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('starts fresh practice puzzles without changing daily statistics',async()=>{
    const user=userEvent.setup();render(<App/>);await user.click(screen.getByRole('button',{name:'Practice'}));const first=loadState().practice;expect(first?.answer).not.toBe(dailyPuzzle().answer);await user.click(screen.getByRole('button',{name:'Next Country'}));expect(loadState().practice?.answer).not.toBe(first?.answer);expect(loadState().daily).toEqual({});
  });
});
