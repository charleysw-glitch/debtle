# Debtle focused update

Prepared for review on local branch `update/debtle-creditors-logo-eastern-reset`. The current live site was not published over. GitHub repository access was unavailable (HTTP 401 and no GitHub remote), so the complete updated project is supplied as a ZIP.

## Changes

1. **Direct copy.** Removed references to connections, connecting dots and worldly perspectives. Kept the exact main headline and styling. The result now says “You got it in N of 6 guesses. Well done!” The treemap heading is “PPG EXTERNAL DEBT + IMF CREDIT”; its existing dollar value and subtitle are preserved.
2. **Multiple Lenders.** Reviewed all 50 positive counterpart-994 debtor balances against cached World Bank 2025 country tables. Applied verified categories for 27 countries, with four splits (Bangladesh, Grenada, Haiti and Saint Vincent and the Grenadines). Original balances are never replaced with publication amounts. Every split preserves its original amount, and rounded-thousand adjustments are disclosed. The remaining 23 stay gray Other, including Belize: the BLZ endpoint returned a blank country template and could not verify the claimed bilateral exposure. Multiple Lenders remains its name and is explained separately from Unallocated.
3. **Alternative logo.** Added one SVG globe made from nine treemap tiles, with a matching standalone asset and favicon. The original logo remains selected. Preview at `/?logo=globe`; switch the default with `DEFAULT_LOGO_VARIANT` in src/config/brand.ts.
4. **Eastern reset.** The shared date is now America/New_York. The frozen pool, country permutation and date-based puzzle numbering are preserved. Real local midnights determine countdown/reset timing, including 23/25-hour DST days. Existing LocalStorage date keys are preserved verbatim to keep each stored result attached to its original answer. Open, suspended and restored tabs update automatically. Practice progress is unchanged.

## Changed files by purpose

| Purpose | Main files |
|---|---|
| Copy and preserved UI | src/App.tsx; src/components/{Treemap,HowToPlay,GuessHistory,Info,Statistics,CountryProfile}.tsx; index.html |
| Creditor pipeline | scripts/{preprocess_ids,multiple_lenders,import_multiple_lenders,create_classification}.py; data/{creditor-classification,multiple-lenders-classification}.json; data/source/ids-detailed-2025/ |
| Processed data and audit | src/data/debt.json; src/data/creditor-info.ts; reports/{reconciliation.csv,quality-report.md,multiple-lenders.csv,multiple-lenders-report.md}; downloadable report/data copies in public/ |
| Logo option | src/components/{BrandLogo,GlobeLogo}.tsx; src/config/brand.ts; public/{logo-globe,favicon-globe}.svg |
| Eastern time and migration | src/game/{daily.ts,usePuzzleClock.ts,storage.ts} |
| Tests | tests/{eastern-reset,brand-and-creditor}.test.tsx; tests/test_multiple_lenders.py; updated existing tests; tests/e2e/updates.spec.ts; playwright.config.ts |
| Documentation | README.md; reports/{verification.md,update-summary.md}; reports/previews/; refreshed downloadable source/static packages |

The existing project structure, Vercel and Netlify configuration, gameplay rules, country search, geographic calculations, base visual styles and debt denominators are retained. New CSS only sizes the alternate mark and formats the requested tooltip explanation. No new runtime dependencies are needed.

## Verification and deployment

130 checks passed (56 data, 56 unit/component, 18 desktop/mobile browser), and the production build passed. More detail is in verification.md and the Multiple Lenders reports.

After extracting, run `npm ci`, `npm test`, and `npm run build`. Vercel and Netlify use the existing `dist` output configuration. Python is needed only to rebuild/audit source data. Review the changes in the actual GitHub repository before deploying them.
