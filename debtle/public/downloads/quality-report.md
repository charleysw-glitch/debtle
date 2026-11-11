# IDS 2025 reconciliation and quality report

Source: `P_Data_Extract_From_International_Debt_Statistics.xlsx` (SHA-256 `51bb6e4cf00e475bf0573f49364b3a094dcabac83e6168fdd7a0bd4fc81718f8`).

The workbook contains 134 debtor entries and 304 counterpart areas. The source has 14 aggregate debtors, including LDC (Least developed countries: UN classification), beyond the 13 codes in the brief. ISO country validation plus the explicitly supported Kosovo code XKX leaves 120 individual countries. 120 pass validation and enter the game.

## Method

Only `DT.DOD.DPPG.CD` and `DT.DOD.DIMF.US.CD`, 2025, current US dollars. PPG WLD is authoritative and excluded from creditor entries. IMF uses counterpart 907 exactly once; its World duplicate is checked and excluded. No SDR-inclusive indicator is used. Missing observations remain null internally; numeric zero is an observation. Missing individual matrix cells are not converted into debt balances. Countries lacking authoritative totals or IMF confirmation are quarantined.

Tolerance: max($0.01, official total × 1e-10). Positive material residuals become Unallocated; negative material residuals quarantine the country. Reported balances are never rescaled. Rounding differences below tolerance remain visible in the CSV and can produce insignificant deviations from 100%.

## Residuals

| Country | Unallocated USD | Share of PPG |
|---|---:|---:|
| Bolivia (BOL) | $5,011,010.80 | 0.035316% |
| Serbia (SRB) | $1,000,000,000.00 | 3.108354% |
| Türkiye (TUR) | $144,458,025.00 | 0.076604% |

## Classification and limits

All 303 non-World counterpart codes have an explicit, editable mapping in data/creditor-classification.json. Individual institutions, IDA, and IBRD remain separate. Historical sovereign and territorial counterparts remain bilateral; no rule classifies numeric ranges. Codes 896, 897, 922, 939, 946 and 962 use conservative other/unclassified treatment, as do 994 and FCW. Positive unclassified balances are flagged per country, but do not invalidate reconciled data.

Positive other/multiple-lender codes in this extract: 896, 922, 994.

Review/quarantined countries: none. All IMF 907/World comparisons pass for eligible countries.

Geographic coordinates: area-weighted planar geographic centroids derived from Natural Earth 1:50m Admin 0 Countries, with antimeridian unwrapping. These are approximate land centroids, not capitals. Kosovo uses the common World Bank code XKX, which is not an officially assigned ISO 3166-1 code.

Source coverage is limited to reporting debtors; this is not every country in the world. The measure is PPG external debt plus IMF credit, not total public debt or total external debt. Empty cells cannot establish the absence of every possible creditor relationship.

See reconciliation.csv for every country, discrepancy, IMF duplicate check, observed zero count, percentage sum, validation status and warnings.
