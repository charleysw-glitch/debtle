"""Country-specific Multiple Lenders classification; no network at import time.
Supplemental amounts establish creditor type, never replace the source balance.
"""
from __future__ import annotations
import csv
import hashlib
import json
import math
from pathlib import Path

DESCRIPTION='World Bank category for debt involving creditors from multiple countries or territories not separately identified. The underlying lenders may be bilateral, multilateral, or private, depending on the loan.'
TYPE_LABELS={'bilateral':'Official bilateral','multilateral':'Official multilateral','private':'Non-official (private)'}
GUIDE_URL='https://thedocs.worldbank.org/en/doc/6e72b0ded996306fa01f5db7a0c38b19-0050052021/related/IDS-2025-User-Guide-and-Methodology.pdf'

def load_evidence(root:Path):
    path=root/'data/multiple-lenders-classification.json'
    if not path.exists():return {}
    evidence=json.loads(path.read_text())['countries']
    for entry in evidence.values():
        source=root/entry['sourceFile']
        if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest()!=entry['sourceSha256']:
            entry['status']='unavailable';entry['notes']='Supplemental source file is missing or its hash changed; classification not applied.'
    return evidence

def rounding_tolerance(original:float,rows:list):
    # The detailed table rounds EACH stock observation to the nearest US$1,000.
    return max(1.0,500.0*len(rows),abs(original)*1e-10)

def classify(iso3:str,original:float,entry:dict|None):
    entry=entry or {}
    rows=entry.get('rows',[])
    rows_valid=isinstance(rows,list) and bool(rows) and all(isinstance(r,dict) and r.get('type') in TYPE_LABELS and isinstance(r.get('amountThousands'),(int,float)) and math.isfinite(r['amountThousands']) and r['amountThousands']>=0 for r in rows)
    source_sum=math.fsum(r['amountThousands']*1000 for r in rows) if rows_valid and entry.get('units')=='US$ thousands' else None
    diff=source_sum-original if source_sum is not None else None
    tol=rounding_tolerance(original,rows)
    fallback={'id':'ppg:994','code':'994','name':'Multiple Lenders','type':'other','value':original,'share':0,
        'description':DESCRIPTION,'classificationStatus':'unresolved','creditorTypeLabel':'Not verified'}
    reason=entry.get('notes','No supplemental table evidence available.')
    valid=(entry.get('status')=='available' and entry.get('year')==2025 and entry.get('units')=='US$ thousands'
        and rows_valid)
    balances={}
    if entry.get('status')=='available' and not valid:
        reason='Missing or invalid 2025 stock evidence, units or creditor type; classification not applied.'
    if valid:
        if abs(entry.get('originalAmountUSD',-1)-original)>max(.01,abs(original)*1e-10):
            valid=False;reason='Original extract balance has changed since this evidence was reviewed.'
        elif abs(diff)>tol:
            valid=False;reason='Supplemental category amounts do not reconcile within their published rounding precision.'
        else:
            for row in rows:balances[row['type']]=balances.get(row['type'],0)+row['amountThousands']*1000
            balances={kind:value for kind,value in balances.items() if value>0}
            if not balances:valid=False;reason='Supplemental table has no positive category balance.'
    result=[fallback]
    adjustment=0
    if valid:
        largest=max(balances,key=balances.get)
        adjustment=original-math.fsum(balances.values())
        if balances[largest]+adjustment<0:
            valid=False;reason='Rounding adjustment would produce a negative category amount.'
        else:
            result=[]
            for kind,value in sorted(balances.items(),key=lambda x:(-x[1],x[0])):
                correction=adjustment if kind==largest else 0
                result.append({'id':f'ppg:994:{kind}' if len(balances)>1 else 'ppg:994','code':'994','name':'Multiple Lenders',
                    'type':kind,'value':value+correction,'share':0,'description':DESCRIPTION,'creditorTypeLabel':TYPE_LABELS[kind],
                    'classificationStatus':'verified','classificationSource':entry['sourceUrl'],
                    'sourceRoundedValueUSD':value,'roundingAdjustmentUSD':correction})
            reason='Verified category amounts; original extract balance preserved.'
            if adjustment:reason+=' Published rounding difference assigned to the largest category; disclosed in this report.'
    status='split_verified' if valid and len(result)>1 else 'verified' if valid else 'unresolved'
    diagnostic={'iso3':iso3,'country':entry.get('countryName',iso3),'original_amount_usd':original,
        'table_total_usd':source_sum,'table_minus_original_usd':diff,'rounding_tolerance_usd':tol,
        'verified_classifications':'; '.join(TYPE_LABELS[c['type']] for c in result) if valid else '',
        'applied_split_json':json.dumps([{'type':c['type'],'amountUSD':c['value']} for c in result]),
        'split_rounding_adjustment_usd':adjustment if valid else 0,'preserved_amount_usd':math.fsum(c['value'] for c in result),
        'status':status,'notes':reason,'source_year':entry.get('year'),'source_units':entry.get('units',''),
        'source_updated':entry.get('sourceUpdated',''),'source_url':entry.get('sourceUrl',f'https://datatopics.worldbank.org/dssitables/annual/{iso3}'),
        'source_sha256':entry.get('sourceSha256','')}
    return result,diagnostic

def write_diagnostics(reports:Path,diagnostics:list):
    reports.mkdir(exist_ok=True,parents=True)
    with (reports/'multiple-lenders.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(diagnostics[0]));writer.writeheader();writer.writerows(diagnostics)
    verified=[r for r in diagnostics if r['status']!='unresolved'];unresolved=[r for r in diagnostics if r['status']=='unresolved']
    lines=['# Multiple Lenders classification review','',f'{len(diagnostics)} individual debtors have positive counterpart 994 balances. {len(verified)} have verified category evidence, including {sum(r["status"]=="split_verified" for r in verified)} splits. {len(unresolved)} remain gray Other.','',
        'The original workbook is authoritative for every dollar balance. Supplemental 2025 World Bank detailed country tables are used only for creditor type. Their values are in US$ thousands, multiplied by 1,000 before comparison. Tolerance is half a displayed US$1,000 unit per category row (including reported zero rows), with a small relative floating-point bound. Single-category entries keep the original value exactly. For a reconciled split, any disclosed rounding difference is assigned to the largest category so the original total is preserved exactly. No PPG or IMF totals are changed.','',
        'Multiple Lenders is a mixed-creditor counterpart entity, separate from an Unallocated reconciliation residual. Its lenders can be official bilateral, official multilateral, or non-official. FCW (Other Multiple Lenders) is a distinct glossary category for private nonguaranteed/short-term obligations, which remain excluded from this game.','',
        f"The cached annual endpoints supplied usable category rows for {sum(r['table_total_usd'] is not None for r in diagnostics)} of these countries. Unavailable or empty templates (including blank country names, zero totals, or no lender rows) do not establish classification or absence of debt. Each unresolved reason is recorded in the CSV.",'',
        next((f"Belize: ${r['original_amount_usd']:,.2f}; {r['status']}. {r['notes']} The original balance is preserved. A blue bilateral rectangle is applied only if matching 2025 evidence is verified." for r in diagnostics if r['iso3']=='BLZ'),'Belize has no positive Multiple Lenders balance in this extract.'),'',
        '| Country | Original USD | Verified types / split USD | Table − extract USD | Status |','|---|---:|---|---:|---|']
    for r in diagnostics:
        applied=json.loads(r['applied_split_json'])
        types='; '.join(f"{TYPE_LABELS.get(c['type'],'Other')}: ${c['amountUSD']:,.2f}" for c in applied)
        diff='unavailable' if r['table_minus_original_usd'] is None else f"{r['table_minus_original_usd']:,.2f}"
        lines.append(f"| {r['country']} ({r['iso3']}) | {r['original_amount_usd']:,.2f} | {types} | {diff} | {r['status']} |")
    lines += ['', '## Sources and reproducibility','',f'- [World Bank IDS 2025 User Guide and Methodology, glossary]({GUIDE_URL}).',
        '- [Detailed annual country tables](https://datatopics.worldbank.org/dssitables/annual/). Every country-specific URL, source hash, original balance, rounding tolerance, adjustment and unresolved reason is included in multiple-lenders.csv.',
        '- Raw HTML snapshots, including empty responses, are bundled in data/source/ids-detailed-2025/. The extracted evidence registry is data/multiple-lenders-classification.json. Run python scripts/import_multiple_lenders.py to rebuild it from the local snapshots, then run the normal IDS importer. Neither step needs network access.',
        '- Empty or nonreconciling evidence is never treated as a verified classification. Future evidence can be applied by replacing the country snapshot and rebuilding the registry; the importer independently checks year, units, original amount, source hash and rounding reconciliation.']
    (reports/'multiple-lenders-report.md').write_text('\n'.join(lines)+'\n')
