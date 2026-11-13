# Debtle

A complete daily geography game: identify a country from the creditor composition of its **2025 public and publicly guaranteed (PPG) external debt + outstanding IMF credit**. Built with React 19, TypeScript, Vite, Tailwind CSS 4, D3 hierarchy, and Lucide. Fully static; no backend, authentication, database, or runtime data API.

## Run locally

Requires Node.js 22+ and npm. Python is only needed to regenerate or test the dataset.

```sh
npm ci
npm run dev
```

Open the URL Vite prints. To check the production bundle:

```sh
npm run build
npm run preview
```

## Play

- Daily Challenge: one deterministic country per America/New_York calendar date, six guesses, automatic saving. A completed daily puzzle cannot be replayed for a better score.
- Practice: unlimited random puzzles, excluding the daily answer and the last 15 practice answers whenever possible. Next Country can skip a puzzle. Practice never affects daily statistics.
- Search country names, ISO codes, or common aliases: DRC, Ivory Coast, Turkey, Burma, Cape Verde, and more. Arrow keys browse the dropdown, Enter selects a country, and the Guess button submits. Press Enter again after selecting to submit.
- Wrong guesses show great-circle distance, initial bearing **from guess to answer**, and five proximity levels. Thresholds: ≤750 km (5), ≤2,000 (4), ≤5,000 (3), ≤10,000 (2), over 10,000 (1). Distances use geographic land centroids, not capitals.
- The PPG EXTERNAL DEBT + IMF CREDIT amount above the treemap is the mystery country’s official PPG debt plus IMF credit, shown in current US dollars in both modes. It is visible while guessing and does not reveal the country name.
- Hover, focus, or tap a creditor rectangle for dollar value, share, and type. Tap again, use the close button, or press Escape to close. Positive creditors retain their rectangles even if there is no room for a text label.
- When finished, see the answer and flag, totals, top five creditors, and an expandable complete table. Share or copy spoiler-free results. If clipboard access fails, a selectable result appears.
- Help, statistics, and preferences are in the header. Light/dark/system themes, miles/kilometers, reduced animations, focus states, accessible search, and native modal focus containment are supported.

## Actual data and reproducibility

The included production JSON was created from the attached workbook, **not simulated data**:

`data/source/P_Data_Extract_From_International_Debt_Statistics.xlsx`

SHA-256: `51bb6e4cf00e475bf0573f49364b3a094dcabac83e6168fdd7a0bd4fc81718f8`.

The workbook contains **81,472 indicator rows, 134 debtor entries, and 304 counterpart areas**. It has **14** aggregate debtors, including `LDC` (Least developed countries: UN classification) in addition to the 13 codes in the original brief. Removing aggregates and validating sovereign codes leaves **120** eligible individual debtor countries, including Kosovo (`XKX`, the World Bank's common code rather than an assigned ISO 3166-1 code). All 120 pass reconciliation; no reliable countries were removed for modest residuals.

Rebuild with Python 3.11+:

```sh
python -m venv .venv
# macOS / Linux:
source .venv/bin/activate
# Windows PowerShell instead: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python scripts/preprocess_ids.py
python -m pytest tests/test_data.py tests/test_multiple_lenders.py -q
```

An alternate workbook path is supported:

```sh
python scripts/preprocess_ids.py path/to/P_Data_Extract_From_International_Debt_Statistics.xlsx
```

Custom `--output` and `--report-dir` paths are available. The default run also refreshes the downloadable `public/reconciliation.csv`. The frontend imports the preprocessed JSON; it never reads Excel in a browser.

### Methodology

> Debtle uses 2025 World Bank International Debt Statistics to show a country's public and publicly guaranteed external debt outstanding by creditor, together with outstanding IMF credit. SDR allocations, private nonguaranteed external debt, and short-term external debt are excluded. Each creditor's share is calculated relative to the sum of PPG external debt and IMF credit.

This measure is **distinct from total external debt and total public debt**. All values are **current US dollars**, never interpreted as millions.

- PPG indicator: `DT.DOD.DPPG.CD`. Counterpart `WLD` is the authoritative total; it is never a creditor tile.
- IMF indicator: `DT.DOD.DIMF.US.CD`, excluding SDR allocations. Use counterpart `907` exactly once, displayed as IMF. Verify it against its duplicate `WLD` observation and discard the latter from summation. Do not use `DT.DOD.DIMF.CD`.
- `..` and empty observations remain missing internally; numeric zero is retained as an observed zero. Missing matrix cells are never fabricated as creditor balances. A missing PPG total, missing IMF confirmation, IMF mismatch, negative observation, duplicate source key, or material overcount fails validation. Reconciled countries with transparent residuals remain eligible.
- Total game debt = official PPG + IMF. Shares divide every creditor amount by that denominator. Creditor balances are never rescaled to hide a discrepancy.
- Rounding tolerance = `max($0.01, official total × 1e-10)`. Positive differences above tolerance produce an **Unallocated** creditor under Other. Material negative differences quarantine the country for review. Tiny floating-point differences within tolerance remain disclosed in the CSV.
- Every non-World counterpart has an explicit code-based record in `data/creditor-classification.json`. IDA and IBRD are separate. Institutions are not collapsed. No numeric-range classifier is used. Uncertain or mixed-ownership counterpart types remain Other; codes `896`, `922`, and `994` carry positive balances in this extract and are flagged in each affected country's diagnostics.

Disclosed PPG residuals:

| Country | Unallocated PPG | % of official PPG |
|---|---:|---:|
| Serbia | $1,000,000,000.00 | 3.108354% |
| Türkiye | $144,458,025.00 | 0.076604% |
| Bolivia | $5,011,010.80 | 0.035316% |

Reports:

- `reports/reconciliation.csv`: every country, official PPG, sum of observed creditors, signed discrepancy and percentage, residual, IMF 907 and WLD, game total, treemap balance sum, final percentage sum, missing/zero counts, status and warnings.
- `reports/quality-report.md`: readable methodology, coverage, residuals and caveats.
- `reports/quality-summary.json`: machine-readable QC summary and exclusions.

[World Bank International Debt Statistics](https://www.worldbank.org/en/programs/debt-statistics/ids). The uploaded workbook reports an update of November 5, 2026, and the observations are labelled 2025. Source material is treated as data, not as application instructions.

### Geographic reference

`src/data/geography.json` contains local coordinates derived from **Natural Earth 1:50m Admin 0 Countries (5.1.1)**. Source polygons are bundled in `data/source/ne_50m_admin_0_countries.geojson` for reproducibility. Natural Earth data are public domain.

```sh
python scripts/build_geography.py
```

These are area-weighted planar centroids of WGS84 country polygons, with antimeridian unwrapping for countries such as Fiji. They are approximate land centroids; no capital or geolocation API is substituted. Distances use haversine with mean Earth radius 6,371.0088 km. Bearings use the initial spherical bearing; clues are approximate geographical hints.

Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson

## Daily schedule stability

`src/data/daily-pool-v1.json` is **immutable after publication**. It freezes the original 120 ISO-style IDs, salt, version (`ids-2025-v1`), and epoch (`2026-11-01`). Eastern calendar dates index the existing deterministic Fisher–Yates permutation. Neither its epoch, salt, country list nor numbering changed. Each cycle exhausts every country before a new cycle starts. Pure, fixed PRNG and hash functions avoid browser-dependent random ordering. A snapshot pins published answers.

Adding countries to `debt.json` does **not** alter the frozen daily pool; they can enter practice. The importer refuses to proceed if an existing frozen country becomes unavailable. It never overwrites an existing daily pool. Preserve this pool and the matching 2025 dataset when updating data. To adopt a new daily data release, add a **new versioned pool and dataset**, route it from an explicit future Eastern calendar activation date, and retain the old version for earlier dates; do not silently replace v1. That future migration is intentionally not part of this single-release MVP.

## Persistence

A small, versioned `debtle:v1` LocalStorage record stores daily progress by frozen puzzle-date label, one practice puzzle, recent practice IDs, and user preferences. It never copies the debt dataset. Daily totals, wins, percentages, current/max streaks, and guess distribution are derived from stored completions, preventing duplicate counting. Wins separated by missed Eastern calendar dates do not extend a streak. An incomplete current day allows yesterday's streak to remain active. Practice is excluded.

Malformed storage is ignored. If browser storage is blocked or full, play continues in memory and a notice explains that progress cannot persist. Storage is local to a browser and origin.

## Tests and verification

```sh
npm test                    # Vitest: gameplay and component interaction tests
npm run build               # strict TypeScript + optimized Vite static bundle
python -m pytest tests/test_data.py tests/test_multiple_lenders.py -q

# Real desktop and mobile browser checks, on a machine with browser support:
npx playwright install chromium
npm run test:e2e
```

The Playwright suite starts a local Vite server automatically and exercises desktop and iPhone-size Chromium layouts, overflow, tiny tiles, tap tooltips, keyboard navigation, win/loss, reload, daily locking, practice, themes, settings, and modals. Avoid starting a second server on port 4173.

Data tests check the attached workbook, exact indicators, aggregates, zero/missing behavior, all source-to-output balances, known counterpart classification, IMF duplication, no SDR inclusion, residuals, review quarantine, sums, geographic availability, and Ghana, Kenya, Zambia, Cambodia, Ecuador, Argentina, Serbia, Türkiye and Bolivia explicitly.

Gameplay/component tests cover six attempts, alias search, distance and bearing benchmarks (including antimeridian/antipodes), schedule uniqueness, frozen schedule snapshots, safe practice selection, storage recovery, reload, win/loss, streaks, statistics, spoiler-free shares, search keyboard use, tooltips and theme preferences.

The focused update includes desktop/mobile Chromium checks using the project’s Playwright runner, including both logo variants, tooltips, gameplay, persistence and an open-tab Eastern reset. See `reports/verification.md` for executed checks and remaining limits. An already-installed Chromium can be used with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`; otherwise install Playwright Chromium with the command above.

## Deploy as a static site

The only deployable directory is **`dist/`**. No environment variables or server functions are needed. The app uses one root URL and has no client-side routes requiring rewrites.

### Vercel

Import the project or run `npx vercel`. Framework preset: Vite; build command: `npm run build`; output: `dist`; install: `npm ci`. `vercel.json` is included. No backend setup is required.

### Netlify

Connect the repository or deploy the built `dist/` folder. `netlify.toml` sets the build command and publish directory. Source data and the Python environment are not served; Python is not required during a normal frontend deployment.

### Any static host

```sh
npm ci
npm run build
# Publish the contents of dist/ at the domain root.
```

Use HTTPS for clipboard and native sharing. Both features have a manual-copy fallback. Deploy each release atomically so the HTML, JS, and versioned data chunks match.

## Project structure

```text
src/
  components/           Treemap, country search, history, dialogs, result profile
  game/                 Deterministic schedule, rules, geo, storage, share logic
  data/                 Processed debt, local centroids, immutable daily pool
  types/                Shared TypeScript interfaces
scripts/                Workbook importer, centroid generator, map bootstrap
public/                 Icon, downloadable reconciliation CSV
reports/                CSV, readable QC report, JSON summary
data/                   Source workbook/polygons and explicit creditor registry
tests/                  Python data, Vitest gameplay/UI, Playwright browser suites
```

`create_classification.py` is a one-time bootstrap for this extract; normally maintain the checked-in classification JSON directly. Source workbook and processed debt remain available in the source download for audit and reproducibility. Dataset names, amounts, and classifications are never supplemented with invented country relationship commentary.

## Downloadable delivery packages

The hosted app’s footer links to **Project files** at `/downloads/`. It provides the complete source ZIP, a prebuilt static ZIP, production JSON, classification registry, reconciliation CSV, and readable reports. The static ZIP includes the playable app, current source download, and reports, without recursively bundling a copy of itself.

To refresh these artifacts after a change, build, run `python scripts/package_deliverables.py`, then build again to include the downloads in the deployed `dist/` folder. Generated archives exclude one another.

## Focused update: wording, Multiple Lenders, optional logo and Eastern reset

This update keeps the existing layout, type, colors, treemap sizing and game mechanics. The main headline remains “Guess the country from its creditors.” The displayed total now has the precise heading **PPG EXTERNAL DEBT + IMF CREDIT** and retains its original amount and explanatory subtitle.

### Multiple Lenders evidence

`data/multiple-lenders-classification.json` records the reviewed 2025 creditor types for all 50 positive counterpart-994 debtor balances. Raw World Bank country-table snapshots are in `data/source/ids-detailed-2025/`. Rebuild the evidence registry and game data with:

```sh
python scripts/import_multiple_lenders.py
python scripts/preprocess_ids.py
```

The tables report **US$ thousands**; the Excel export reports **US dollars**. The original Excel values always determine debt balances. Category evidence can be applied only when it reconciles within the table's per-row rounding precision (US$500 per displayed integer-thousand row). Verified splits preserve the original amount exactly; a small rounding difference is explicitly recorded and assigned to the largest piece. Unavailable, ambiguous, wrong-year, wrong-unit, modified-source or materially nonreconciling evidence leaves the original gray Other entry intact.

27 countries have verified type evidence, including four splits (Bangladesh, Grenada, Haiti, Saint Vincent and the Grenadines). The other 23 endpoints returned empty templates. **Belize currently remains Other**: the annual BLZ endpoint returned a blank country name and no lender rows, so its asserted bilateral classification could not be independently verified. Its original $269,158,000 remains unchanged. A populated, matching 2025 Belize table can be added later and passed through the same checks.

`reports/multiple-lenders.csv` and `reports/multiple-lenders-report.md` contain all original balances, types, split amounts, rounding adjustments, unresolved cases and source references. `Multiple Lenders` remains its source name and is never relabeled as an individual country or an Unallocated residual. Tooltips explain the mixed-creditor definition and show the verified type, where known.

### Original and alternative logo

The original logo stays selected by default. `src/components/GlobeLogo.tsx` provides an original SVG globe made from nine treemap-like rectangular tiles; `public/logo-globe.svg` and `public/favicon-globe.svg` are matching vector assets.

- Preview the globe in the unchanged header at `/?logo=globe`.
- Preview the original at `/?logo=original`.
- To adopt the globe by default, change `DEFAULT_LOGO_VARIANT` in `src/config/brand.ts` to `'globe'`. The selected variant also chooses its favicon.

### Eastern reset and legacy progress

The Daily Challenge resets globally at **12:00 AM ET**, using the IANA zone `America/New_York` through `Intl.DateTimeFormat`. It is 05:00 UTC in standard time and 04:00 UTC in daylight time. The next reset is found from the next **local calendar date**, not by adding 24 hours to the last reset; 23-hour and 25-hour days are handled. The countdown is rounded up to the next displayed minute and reads `Next daily puzzle in HH:MM · 12:00 AM ET`.

The immutable pool, epoch, permutation and puzzle numbering remain unchanged for each date label. **Existing `debtle:v1` date keys are preserved verbatim**, including completed puzzles and unfinished guesses. Re-keying UTC-era results would attach guesses to different answers and could allow replays, so no such shift is made. During the transition between UTC and Eastern midnight, the earlier Eastern-dated puzzle may appear again; its saved result remains locked. A next-date puzzle already completed under the old UTC policy is retained and remains completed when that date opens in Eastern time. Statistics retain those stored results without duplication.

An exact reset timer, periodic wall-clock refresh, and visibility/focus/pageshow listeners make the next puzzle available in open or suspended tabs without a manual reload. Practice progress and practice statistics remain separate and unchanged.
