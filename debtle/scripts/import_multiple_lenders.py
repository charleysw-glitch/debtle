"""Extract country-specific 2025 classifications from cached World Bank tables.
Uses only the Python standard HTML parser; original Excel balances remain authoritative.
"""
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,re
import preprocess_ids as ids

ROOT=Path(__file__).resolve().parents[1]
TYPES={'Official bilateral':'bilateral','Official multilateral':'multilateral','Non-official':'private','Bondholders':'private'}
class Rows(HTMLParser):
    def __init__(self):super().__init__();self.rows=[];self.stack=[];self.cells=[];self.text=[]
    def handle_starttag(self,tag,attrs):
        if tag=='tr':
            if self.stack:self.stack[-1]['nested']=True
            self.stack.append({'cells':[],'nested':False})
        elif tag in ('td','th') and self.stack:self.cells.append((self.stack[-1],[]))
    def handle_data(self,data):
        self.text.append(data)
        if self.cells:self.cells[-1][1].append(data)
    def handle_endtag(self,tag):
        if tag in ('td','th') and self.cells:
            row,text=self.cells.pop();row['cells'].append(' '.join(' '.join(text).split()))
        elif tag=='tr' and self.stack:
            row=self.stack.pop()
            if not row['nested']:self.rows.append(row['cells'])

def parse_snapshot(content:bytes,year=2025):
    parser=Rows();parser.feed(content.decode('utf-8-sig',errors='replace'))
    full=' '.join(' '.join(parser.text).split())
    country=re.search(r'Country\s*:\s*(.*?)\s*Last Updated Date\s*:',full)
    updated=re.search(r'Last Updated Date\s*:\s*([0-9/]+)',full)
    year_rows=[row for row in parser.rows if str(year) in row and len([c for c in row if re.fullmatch(r'20\d\d',c)])>=5]
    if not country or not country.group(1).strip():return [],'Empty country table: blank country name and no verified lender rows.',updated.group(1) if updated else ''
    if 'Data are in US$ thousands' not in full or not year_rows:return [],'Required 2025 stock column or US$ thousands units missing.',updated.group(1) if updated else ''
    years=[c for c in year_rows[0] if re.fullmatch(r'20\d\d',c)]
    index=years.index(str(year))+2;category='';result=[]
    for row in parser.rows:
        if len(row)!=len(years)+2:continue
        if row[0] in TYPES:category=row[0]
        if row[0]=='Total':break
        if row[1]!='Multiple Lenders':continue
        raw=row[index].replace(',','')
        if category not in TYPES or not re.fullmatch(r'\d+(\.\d+)?',raw):return [],'Ambiguous category or missing stock value for Multiple Lenders.',updated.group(1) if updated else ''
        result.append({'creditorType':category,'type':TYPES[category],'amountThousands':float(raw)})
    return result,'2025 detailed creditor rows extracted.' if result else 'No Multiple Lenders row in the populated 2025 table.',updated.group(1) if updated else ''

def build():
    frame=ids.read_workbook(ROOT/'data/source/P_Data_Extract_From_International_Debt_Statistics.xlsx')
    selected=frame[(frame['Series Code']==ids.PPG)&(frame['Counterpart-Area Code']=='994')&(frame['value']>0)&(~frame['Country Code'].isin(ids.AGGREGATES))]
    manifest_path=ROOT/'data/source/ids-detailed-2025/fetch-status.json'
    manifest={r['iso3']:r for r in json.loads(manifest_path.read_text())} if manifest_path.exists() else {}
    result={}
    for _,row in selected.iterrows():
        iso=row['Country Code'];path=ROOT/f'data/source/ids-detailed-2025/{iso}.html'
        blob=path.read_bytes() if path.exists() else b''
        rows,notes,updated=parse_snapshot(blob) if blob else ([], 'Source snapshot unavailable.','')
        result[iso]={'countryName':str(row['Country Name']),'year':2025,'units':'US$ thousands','originalAmountUSD':float(row['value']),
            'sourceUrl':f'https://datatopics.worldbank.org/dssitables/annual/{iso}',
            'sourceFile':str(path.relative_to(ROOT)),'sourceSha256':hashlib.sha256(blob).hexdigest(),'sourceUpdated':updated,'sourceRetrievedOn':manifest.get(iso,{}).get('retrievedOn','not recorded'),
            'status':'available' if rows else 'unavailable','rows':rows,'notes':notes}
    payload={'schemaVersion':1,'generatedAt':datetime.now(timezone.utc).isoformat(),'purpose':'Creditor type only; original workbook dollar balances remain authoritative.','countries':dict(sorted(result.items()))}
    (ROOT/'data/multiple-lenders-classification.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    print(f"Reviewed {len(result)} countries: {sum(bool(v['rows']) for v in result.values())} populated classifications, {sum(not v['rows'] for v in result.values())} unresolved snapshots.")
if __name__=='__main__':build()
