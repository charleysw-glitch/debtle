# Delivery verification

Verified in the managed execution environment on November 11, 2026:

- **36 Python data tests passed** against the actual uploaded workbook.
- **31 Vitest gameplay and DOM component tests passed**.
- **Production build passed**, including strict TypeScript checking and Vite bundling.
- Production JSON regenerated successfully from the supplied workbook with no quarantined individual countries.
- **120 eligible countries**, **14 aggregate debtors excluded** (including the additional LDC aggregate).
- Every eligible country's IMF 907 balance matches its World duplicate.
- Every creditor balance is checked against its original source observation; all shares reconcile to approximately 100%.
- Three transparent Unallocated residuals: Serbia $1 billion, Türkiye $144,458,025, Bolivia $5,011,010.80.
- All five treemap foreground/background label combinations exceed WCAG AA 4.5:1 contrast in the light theme (5.02, 5.09, 6.50, 5.69, 5.60).
- No placeholder or simulated debt values are used in the application.

## Browser verification limit

The selected managed environment reports a remote desktop capability, but no `cua_repl.js`, desktop JavaScript, or equivalent browser-control tool was exposed to the session. The Sites runtime instructions prohibit substituting a separate browser path in that situation, so no preview server or improvised browser runner was started. Real browser layout, screenshots, device rendering, native share/clipboard APIs and visual dark-mode behavior remain **unverified**.

Ten Playwright cases (five scenarios each on desktop and mobile Chromium) are included for local execution with `npx playwright install chromium` and `npm run test:e2e`. DOM tests verify keyboard interaction, tooltips, themes, win/loss, persistence, daily completion locking and practice separation; those checks do not substitute for a rendered mobile/desktop inspection.
