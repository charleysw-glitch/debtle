"""Reproducible, fail-closed IDS workbook → production JSON + reconciliation.
Run from any directory. No network requests; all reference data are local.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import math
import shutil
from pathlib import Path
import pandas as pd
import pycountry

ROOT=Path(__file__).resolve().parents[1]
PPG='DT.DOD.DPPG.CD'
IMF='DT.DOD.DIMF.US.CD'
YEAR='2025 [YR2025]'
HEADERS=['Country Name','Country Code','Counterpart-Area Name','Counterpart-Area Code','Series Name','Series Code',YEAR]
AGGREGATES={'EAP','ECA','IDX','IDA','LAC','LMY','LIC','LMC','MNA','MIC','SAS','SSA','UMC','LDC'}
NAME_OVERRIDES={'TUR':'Türkiye','CIV':'Côte d’Ivoire','COD':'DR Congo','COG':'Republic of the Congo','EGY':'Egypt','GMB':'The Gambia','IRN':'Iran','KGZ':'Kyrgyzstan','LAO':'Laos','MDA':'Moldova','STP':'São Tomé and Príncipe','SVK':'Slovakia','LCA':'Saint Lucia','VCT':'Saint Vincent and the Grenadines','SOM':'Somalia','SYR':'Syria','VNM':'Vietnam','YEM':'Yemen'}
ALIASES={'COD':['DRC','Democratic Republic of the Congo','Congo Kinshasa','Congo, Dem. Rep.','DR Congo'], 'COG':['Congo Brazzaville','Congo, Rep.','Republic of Congo'], 'CIV':['Ivory Coast',"Cote d'Ivoire",'Côte d’Ivoire'], 'TUR':['Turkey','Turkiye','Türkiye'], 'LAO':['Lao PDR','Lao People’s Democratic Republic'], 'SWZ':['Swaziland'], 'CPV':['Cape Verde'], 'MMR':['Burma'], 'TLS':['East Timor'], 'MKD':['Macedonia'], 'VNM':['Viet Nam'], 'KGZ':['Kyrgyz Republic'], 'IRN':['Iran, Islamic Rep.'], 'EGY':['Egypt, Arab Rep.'], 'GMB':['Gambia'], 'CHN':['PRC'], 'ZAF':['RSA','South Africa'], 'STP':['Sao Tome and Principe'], 'XKX':['Kosovo','XK']}
SOURCE_URL='https://www.worldbank.org/en/programs/debt-statistics/ids'

def number(value):
    """Missing is None, observed zero remains 0. Reject malformed observations."""
    if value is None or (isinstance(value,float) and math.isnan(value)) or str(value).strip() in {'..',''}:
        return None
    if isinstance(value,bool):raise ValueError('Boolean observation')
    result=float(value)
    if not math.isfinite(result) or result<0:raise ValueError(f'Invalid debt value: {value}')
    return result

def tolerance(total):
    # One cent absolute, or one part in 10 billion of the authoritative total.
    return max(0.01,abs(total)*1e-10)

def read_workbook(path):
    frame=pd.read_excel(path,sheet_name='Data',dtype=object,keep_default_na=False,engine='openpyxl')
    if list(frame.columns)!=HEADERS:raise ValueError(f'Unexpected Data headers: {list(frame.columns)}')
    meta=pd.read_excel(path,sheet_name='Series - Metadata',dtype=object,keep_default_na=False,engine='openpyxl')
    if not {PPG,IMF}.issubset(set(meta['Code'])):raise ValueError('Required indicator metadata missing')
    frame=frame[frame['Series Code'].isin([PPG,IMF])].copy()
    for col in ['Country Code','Counterpart-Area Code']:
        frame[col]=frame[col].map(lambda x:str(x).strip())
    frame['value']=frame[YEAR].map(number)
    keys=['Country Code','Series Code','Counterpart-Area Code']
    if frame.duplicated(keys).any():raise ValueError('Duplicate country/indicator/counterpart observation')
    return frame

def process_country(iso3,frame,classification,geography):
    name=str(frame.iloc[0]['Country Name']).strip()
    warnings=[]; errors=[]
    def balance(series,code):
        found=frame[(frame['Series Code']==series)&(frame['Counterpart-Area Code']==code)]
        return None if len(found)!=1 else number(found.iloc[0]['value'])
    ppg=balance(PPG,'WLD'); imf=balance(IMF,'907'); imf_world=balance(IMF,'WLD')
    if ppg is None:errors.append('Missing official PPG total')
    if imf is None or imf_world is None:errors.append('Missing IMF 907 or World observation; not assumed zero')
    if imf is not None and imf_world is not None and abs(imf-imf_world)>tolerance(imf_world):errors.append('IMF 907 / WLD mismatch')
    ppg_imf=balance(PPG,'907')
    if ppg_imf and ppg_imf>0:errors.append('IMF appears in PPG creditors; review potential double counting')
    creditors=[]; unknown=[]
    individual=frame[(frame['Series Code']==PPG)&(frame['Counterpart-Area Code']!='WLD')]
    for _,row in individual.iterrows():
        value=number(row['value'])
        if value is None:continue
        code=row['Counterpart-Area Code']
        entry=classification.get(code)
        if entry is None:
            entry={'name':str(row['Counterpart-Area Name']).strip(),'type':'other'}
        if entry['type']=='other' and value>0:unknown.append(code)
        creditors.append({'id':f'ppg:{code}','code':code,'name':entry['name'],'type':entry['type'],'value':value,'share':0})
    reported=math.fsum(c['value'] for c in creditors)
    difference=(ppg-reported) if ppg is not None else 0
    residual=0
    if ppg is not None:
        if difference>tolerance(ppg):
            residual=difference
            creditors.append({'id':'ppg:unallocated','code':'UNALLOCATED','name':'Unallocated','type':'other','value':residual,'share':0})
            warnings.append('Official PPG total exceeds reported creditors; transparent Unallocated residual added')
        elif difference < -tolerance(ppg):errors.append('Reported PPG creditors exceed official total; quarantined without scaling')
    if unknown:warnings.append('Unclassified/multiple-lender counterpart codes: '+', '.join(sorted(unknown)))
    if imf is not None:
        creditors.append({'id':'imf:907','code':'907','name':'IMF','type':'imf','value':imf,'share':0})
    total=(ppg or 0)+(imf or 0)
    if total<=0:errors.append('No positive total game debt')
    for c in creditors:c['share']=c['value']/total*100 if total else 0
    treemap_total=math.fsum(c['value'] for c in creditors)
    shares=math.fsum(c['share'] for c in creditors)
    if total and abs(treemap_total-total)>tolerance(total):errors.append('Final treemap balances do not reconcile')
    if iso3 not in geography:errors.append('Missing geographic centroid')
    status='review' if errors else 'valid_with_notes' if warnings else 'valid'
    country={'iso3':iso3,'iso2':geography.get(iso3,{}).get('iso2',''),'name':NAME_OVERRIDES.get(iso3,name),'sourceName':name,'aliases':sorted(set(ALIASES.get(iso3,[])+[name,iso3,geography.get(iso3,{}).get('iso2','')])-set([''])), 'year':2025,'centroid':{k:v for k,v in geography.get(iso3,{}).items() if k in ['lat','lon']}, 'ppgTotal':ppg,'imfCredit':imf,'totalDebt':total,'unallocatedDebt':residual,'validationStatus':status,'warnings':warnings,'creditors':sorted(creditors,key=lambda c:(-c['value'],c['id']))}
    report={'country':country['name'],'iso3':iso3,'official_ppg_total':ppg,'reported_ppg_creditors':reported,'ppg_discrepancy_absolute':difference,'ppg_discrepancy_percent':difference/ppg*100 if ppg else 0,'unallocated_ppg_residual':residual,'imf_credit_outstanding':imf,'imf_world_total':imf_world,'total_game_debt':total,'treemap_creditor_balances':treemap_total,'final_percentage_sum':shares,'observed_zero_ppg_creditors':sum(c['value']==0 for c in creditors if c['id'].startswith('ppg:')),'missing_ppg_counterparts':int(individual['value'].isna().sum()),'validation_status':status,'eligible':not errors,'warnings':'; '.join(errors+warnings)}
    return country,report

def build(path,out=ROOT/'src/data/debt.json',report_dir=ROOT/'reports'):
    frame=read_workbook(path)
    classification=json.loads((ROOT/'data/creditor-classification.json').read_text())
    geo=json.loads((ROOT/'src/data/geography.json').read_text())['countries']
    excluded=[];countries=[];reports=[]
    for code,group in frame.groupby('Country Code',sort=True):
        if code in AGGREGATES or (not pycountry.countries.get(alpha_3=code) and code!='XKX'):
            excluded.append({'iso3':code,'name':str(group.iloc[0]['Country Name'])});continue
        country,report=process_country(code,group,classification,geo)
        reports.append(report)
        if report['eligible']:countries.append(country)
    payload={'schemaVersion':1,'dataVersion':'ids-2025-v1','year':2025,'source':{'name':'World Bank International Debt Statistics','url':SOURCE_URL,'workbook':Path(path).name,'sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest(),'workbookUpdated':'2026-11-05','indicators':[PPG,IMF],'units':'current US dollars'},'countries':countries}
    pool=ROOT/'src/data/daily-pool-v1.json'
    if pool.exists():
        frozen=json.loads(pool.read_text())
        missing=set(frozen['countries'])-set(c['iso3'] for c in countries)
        if missing:raise ValueError(f'Frozen daily pool countries unavailable: {missing}; preserve the original dataset for historical puzzles')
    out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(payload,ensure_ascii=False,indent=2,allow_nan=False)+'\n')
    report_dir.mkdir(parents=True,exist_ok=True)
    with (report_dir/'reconciliation.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(reports[0]));writer.writeheader();writer.writerows(reports)
    if report_dir.resolve()==(ROOT/'reports').resolve():
        shutil.copyfile(report_dir/'reconciliation.csv',ROOT/'public/reconciliation.csv')
    summary={'year':2025,'source_sha256':payload['source']['sha256'],'source_rows':len(frame),'debtor_entries':int(frame['Country Code'].nunique()),'counterpart_areas':int(frame['Counterpart-Area Code'].nunique()),'individual_countries':len(reports),'eligible_countries':len(countries),'excluded_aggregates':excluded,'missing_observations':int(frame['value'].isna().sum()),'observed_zeros':int((frame['value']==0).sum()),'review_countries':[r['iso3'] for r in reports if not r['eligible']],'residuals':[{k:r[k] for k in ['iso3','country','unallocated_ppg_residual','ppg_discrepancy_percent']} for r in reports if r['unallocated_ppg_residual']>0],'unclassified_codes':sorted({c['code'] for country in countries for c in country['creditors'] if c['type']=='other' and c['value']>0 and c['code']!='UNALLOCATED'})}
    (report_dir/'quality-summary.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
    text=['# IDS 2025 reconciliation and quality report','',f"Source: `{Path(path).name}` (SHA-256 `{payload['source']['sha256']}`).",'',f"The workbook contains {summary['debtor_entries']} debtor entries and {summary['counterpart_areas']} counterpart areas. The source has 14 aggregate debtors, including LDC (Least developed countries: UN classification), beyond the 13 codes in the brief. ISO country validation plus the explicitly supported Kosovo code XKX leaves {len(reports)} individual countries. {len(countries)} pass validation and enter the game.",'','## Method','',f'Only `{PPG}` and `{IMF}`, 2025, current US dollars. PPG WLD is authoritative and excluded from creditor entries. IMF uses counterpart 907 exactly once; its World duplicate is checked and excluded. No SDR-inclusive indicator is used. Missing observations remain null internally; numeric zero is an observation. Missing individual matrix cells are not converted into debt balances. Countries lacking authoritative totals or IMF confirmation are quarantined.','', 'Tolerance: max($0.01, official total × 1e-10). Positive material residuals become Unallocated; negative material residuals quarantine the country. Reported balances are never rescaled. Rounding differences below tolerance remain visible in the CSV and can produce insignificant deviations from 100%.','', '## Residuals','', '| Country | Unallocated USD | Share of PPG |','|---|---:|---:|']
    text += [f"| {r['country']} ({r['iso3']}) | ${r['unallocated_ppg_residual']:,.2f} | {r['ppg_discrepancy_percent']:.6f}% |" for r in reports if r['unallocated_ppg_residual']]
    text += ['', '## Classification and limits','', 'All 303 non-World counterpart codes have an explicit, editable mapping in data/creditor-classification.json. Individual institutions, IDA, and IBRD remain separate. Historical sovereign and territorial counterparts remain bilateral; no rule classifies numeric ranges. Codes 896, 897, 922, 939, 946 and 962 use conservative other/unclassified treatment, as do 994 and FCW. Positive unclassified balances are flagged per country, but do not invalidate reconciled data.', '', 'Positive other/multiple-lender codes in this extract: '+', '.join(summary['unclassified_codes'])+'.', '', f"Review/quarantined countries: {', '.join(summary['review_countries']) or 'none'}. All IMF 907/World comparisons pass for eligible countries.", '', 'Geographic coordinates: area-weighted planar geographic centroids derived from Natural Earth 1:50m Admin 0 Countries, with antimeridian unwrapping. These are approximate land centroids, not capitals. Kosovo uses the common World Bank code XKX, which is not an officially assigned ISO 3166-1 code.', '', 'Source coverage is limited to reporting debtors; this is not every country in the world. The measure is PPG external debt plus IMF credit, not total public debt or total external debt. Empty cells cannot establish the absence of every possible creditor relationship.', '', 'See reconciliation.csv for every country, discrepancy, IMF duplicate check, observed zero count, percentage sum, validation status and warnings.']
    (report_dir/'quality-report.md').write_text('\n'.join(text)+'\n')
    pool=ROOT/'src/data/daily-pool-v1.json'
    if not pool.exists():
        pool.write_text(json.dumps({'version':'ids-2025-v1','epoch':'2026-11-01','salt':'debtle-daily-v1','countries':sorted(c['iso3'] for c in countries)},indent=2)+'\n')
    else:
        frozen=json.loads(pool.read_text())
        missing=set(frozen['countries'])-set(c['iso3'] for c in countries)
        if missing:raise ValueError(f'Frozen daily pool countries unavailable: {missing}; preserve original dataset for historical puzzles')
    print(json.dumps(summary,indent=2,ensure_ascii=False))
    return payload,reports

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook',nargs='?',type=Path,default=ROOT/'data/source/P_Data_Extract_From_International_Debt_Statistics.xlsx')
    parser.add_argument('--output',type=Path,default=ROOT/'src/data/debt.json')
    parser.add_argument('--report-dir',type=Path,default=ROOT/'reports')
    args=parser.parse_args();build(args.workbook,args.output,args.report_dir)
