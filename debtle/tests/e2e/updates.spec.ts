import { test,expect } from '@playwright/test';
import data from '../../src/data/debt.json' with { type:'json' };
import { dailyPuzzle } from '../../src/game/daily';

test('both logo variants render in the existing header with matching favicons',async({page},info)=>{
  for(const variant of ['original','globe']){
    await page.goto('/?logo='+variant);
    await expect(page.getByRole('heading',{name:'Guess the country from its creditors.'})).toBeVisible();
    await expect(page.locator('.brand')).toBeVisible();
    if(variant==='original')await expect(page.locator('.brand-mark i')).toHaveCount(3);
    else{await expect(page.locator('.brand-globe rect')).toHaveCount(9);await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href','/favicon-globe.svg');}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('.site-header').screenshot({path:info.outputPath(`header-${variant}.png`)});
  }
  await page.screenshot({path:info.outputPath('game-globe.png'),fullPage:true});
});

test('Multiple Lenders displays its verified bilateral color and explanation',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.setItem('debtle:v1',JSON.stringify({version:1,daily:{},practice:{answer:'CAF',id:'type-check',guesses:[],status:'playing'},recentPractice:[],preferences:{theme:'light',unit:'km',reducedMotion:true}})));
  await page.reload();await page.getByRole('button',{name:'Practice',exact:true}).click();
  const tile=page.getByRole('button',{name:/^Multiple Lenders, Bilateral,/});
  await expect(tile.locator('rect')).toHaveAttribute('fill','#3e72a9');await tile.click();
  await expect(page.getByRole('status')).toContainText('Creditor type: Official bilateral');
  await expect(page.getByRole('status')).toContainText('multiple countries or territories not separately identified');
  const rect=await page.getByRole('status').boundingBox();const viewport=page.viewportSize()!;
  expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.x+rect!.width).toBeLessThanOrEqual(viewport.width);
});

test('an open daily puzzle switches at midnight Eastern and preserves prior results',async({page})=>{
  await page.clock.install({time:new Date('2026-11-14T04:59:58Z')});await page.clock.pauseAt(new Date('2026-11-14T04:59:59Z'));
  await page.goto('/');const answer=data.countries.find(c=>c.iso3===dailyPuzzle('2026-11-13').answer)!;
  await page.getByRole('combobox').fill(answer.name);await page.keyboard.press('Enter');await page.getByRole('button',{name:'Guess',exact:true}).click();
  await expect(page.locator('.next-puzzle')).toHaveText('Next daily puzzle in 00:01 · 12:00 AM ET');
  await page.clock.runFor(2000);await expect(page.getByText('PUZZLE #14')).toBeVisible();await expect(page.getByRole('combobox')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('debtle:v1')!).daily['2026-11-13'].status)).toBe('won');
});

test('players in Tokyo and California see the same Eastern puzzle date',async({browser})=>{
  for(const timezoneId of ['Asia/Tokyo','America/Los_Angeles']){
    const context=await browser.newContext({timezoneId});const page=await context.newPage();
    await page.clock.setFixedTime(new Date('2026-11-14T04:30:00Z'));await page.goto('http://localhost:4173/');await expect(page.getByText('PUZZLE #13')).toBeVisible();
    await context.close();
  }
});
