# Focused update verification

Verified on November 13, 2026 against the existing Debtle checkout, on local branch `update/debtle-creditors-logo-eastern-reset`. No live deployment was changed.

- **56 Python tests passed**: original workbook parsing, exact indicators, zero/missing observations, aggregate exclusions, IMF inclusion once, PPG residuals, every creditor-code balance, Multiple Lenders evidence, source hashing, 2025 units, splits, rounding and unresolved fallback.
- **56 Vitest tests passed**: original gameplay and DOM interactions plus winter/summer Eastern reset, 23/25-hour DST days, repeated/skipped hours, outside-timezone players, stable numbering, existing results, active/suspended tabs, practice preservation, logo variants and explanatory tooltips.
- **18 Playwright browser tests passed** in installed Chromium on desktop and iPhone-sized mobile viewports: all prior gameplay scenarios, keyboard search, reload, geographic feedback, win/loss, detailed profiles, daily locking, practice, themes, help/statistics, both header logos and favicons, verified bilateral Multiple Lenders color, explanatory tooltip width, an open-tab midnight Eastern reset, and players in Tokyo and California.
- Production TypeScript/Vite build passed. No new runtime dependencies were added.
- The original logo and original favicon remain the defaults. `/?logo=globe` displays the matching globe mark and favicon in the same header. Actual browser screenshots were inspected; copies are in reports/previews/.
- Every one of the 120 countries retains its exact official PPG, IMF, game-debt and Unallocated totals. Every original creditor-code amount is retained within one cent; only verified 994 balances can be subdivided. The immutable daily pool, epoch, salt and country permutation are unchanged.
- The 50 positive Multiple Lenders countries were checked. 27 have verified 2025 evidence, including 4 reconciled splits; 23 retain Other because the source returned empty country templates. Belize is unresolved; its $269,158,000 remains gray and unchanged.
- `vercel.json` and `netlify.toml` are unchanged. No GitHub PR was opened: the checkout has only the Sites remote and the available GitHub API credentials returned HTTP 401. The ZIP is the review deliverable requested for this situation.

## Practical limits

Browser checks used headless Chromium, including a mobile viewport and touch emulation, rather than physical iOS/Safari hardware. Native sharing and operating-system clipboard permission prompts were not exercised. No live Vercel deployment or unknown GitHub repository was modified or tested. Empty World Bank table templates do not support a more precise classification; the complete raw snapshots, source URLs, hashes and reconciliation decisions are included for review.
