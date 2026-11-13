import { test,expect } from '@playwright/test';
import { dailyPuzzle } from '../../src/game/daily';
import data from '../../src/data/debt.json' with { type:'json' };
const daily=dailyPuzzle('2026-11-13'),answer=data.countries.find(c=>c.iso3===daily.answer)!;

test.beforeEach(async({page})=>{await page.clock.setFixedTime(new Date('2026-11-13T17:00:00Z'));await page.goto('/');});
test('fits viewport, keeps small tiles, and shows creditor detail',async({page})=>{
  await expect(page.getByRole('heading',{name:/Guess the country/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('combobox')).toBeVisible();
  const tiles=page.getByRole('group',{name:/Creditors sized/}).getByRole('button');
  expect(await tiles.count()).toBe(answer.creditors.filter(c=>c.value>0).length);
  await tiles.first().click();await expect(page.getByRole('status')).toContainText('current US$');
  await page.keyboard.press('Escape');await expect(page.locator('.map-tooltip')).toHaveCount(0);
});
test('keyboard selection, geographic feedback, and reload persistence',async({page})=>{
  const wrong=answer.iso3==='GHA'?'Kenya':'Ghana';
  await page.getByRole('combobox').fill(wrong);await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.getByRole('button',{name:'Guess',exact:true}).click();
  await expect(page.locator('.guess-row')).toHaveCount(1);await expect(page.locator('.guess-distance')).toContainText('km');await page.reload();await expect(page.locator('.guess-row')).toHaveCount(1);await expect(page.getByRole('combobox')).toBeVisible();
});
test('win reveals profile, daily stays completed, practice stays separate',async({page})=>{
  await page.getByRole('combobox').fill(answer.name);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Guess',exact:true}).click();
  await expect(page.getByText('Five largest creditors')).toBeVisible();await page.getByText(/View all \d+ creditors/).click();await expect(page.getByRole('table')).toBeVisible();await page.reload();await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.getByRole('button',{name:'Try practice'}).click();await expect(page.getByRole('combobox')).toBeVisible();await page.getByRole('button',{name:'Daily Challenge'}).click();await expect(page.getByRole('combobox')).toHaveCount(0);
});
test('all six attempts end in a loss, then practice works',async({page})=>{
  const wrong=data.countries.filter(c=>c.iso3!==answer.iso3).slice(0,6);
  for(const c of wrong){await page.getByRole('combobox').fill(c.name);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Guess',exact:true}).click();}
  await expect(page.getByText('THE MAP REVEALED')).toBeVisible();await expect(page.getByRole('combobox')).toHaveCount(0);await expect(page.locator('.guess-row')).toHaveCount(6);await page.getByRole('button',{name:'Try practice'}).click();await expect(page.getByRole('combobox')).toBeVisible();
});
test('dark mode, units, reduced motion, help and statistics',async({page})=>{
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Dark',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.getByRole('button',{name:'Miles',exact:true}).click();await page.getByRole('switch').check();await expect(page.locator('html')).toHaveAttribute('data-motion','reduced');await page.keyboard.press('Escape');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button',{name:'How to play',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('six tries');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Statistics',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Guess distribution');
});
