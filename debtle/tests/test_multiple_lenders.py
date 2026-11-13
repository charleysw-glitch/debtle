import copy,csv,json,math
from pathlib import Path
import pytest
from multiple_lenders import classify,load_evidence,rounding_tolerance
from import_multiple_lenders import parse_snapshot
ROOT=Path(__file__).resolve().parents[1]
@pytest.fixture(scope='module')
def evidence():return load_evidence(ROOT)
@pytest.fixture(scope='module')
def countries():return {c['iso3']:c for c in json.loads((ROOT/'src/data/debt.json').read_text())['countries']}

def test_all_positive_multiple_lenders_have_evidence_and_diagnostics(evidence,countries):
    positive={iso for iso,c in countries.items() if any(x['code']=='994' and x['value']>0 for x in c['creditors'])}
    assert len(positive)==50
    assert set(evidence)==positive
    with (ROOT/'reports/multiple-lenders.csv').open() as f:rows=list(csv.DictReader(f))
    assert {r['iso3'] for r in rows}==positive
    for r in rows:assert float(r['preserved_amount_usd'])==pytest.approx(float(r['original_amount_usd']),abs=.01,rel=0)

@pytest.mark.parametrize('iso,kind',[('CAF','bilateral'),('LCA','bilateral'),('ZMB','multilateral'),('AGO','private'),('BFA','private'),('GUY','private')])
def test_verified_actual_country_classification(evidence,countries,iso,kind):
    pieces=[x for x in countries[iso]['creditors'] if x['code']=='994']
    assert len(pieces)==1
    assert pieces[0]['type']==kind
    assert pieces[0]['classificationStatus']=='verified'
    assert pieces[0]['value']==evidence[iso]['originalAmountUSD']
    assert pieces[0]['name']=='Multiple Lenders'
    assert pieces[0]['classificationSource'].endswith('/'+iso)

@pytest.mark.parametrize('iso,expected',[('BGD',{'multilateral':14_860_000,'private':5_139_544_000}),('HTI',{'bilateral':120_942_000,'private':31_392_000}),('VCT',{'bilateral':181_871_000,'private':4_286_000})])
def test_reconciled_splits_preserve_original_amount(evidence,countries,iso,expected):
    pieces=[x for x in countries[iso]['creditors'] if x['code']=='994']
    assert {c['type']:c['value'] for c in pieces}==expected
    assert math.fsum(c['value'] for c in pieces)==evidence[iso]['originalAmountUSD']
    assert len({c['id'] for c in pieces})==len(pieces)
    assert all(c['name']=='Multiple Lenders' for c in pieces)

def test_thousands_units_and_rounding_do_not_replace_original_balances(evidence,countries):
    nga=next(c for c in countries['NGA']['creditors'] if c['code']=='994')
    assert nga['sourceRoundedValueUSD']==4_720_983_000
    assert nga['value']==4_720_982_500
    assert nga['roundingAdjustmentUSD']==-500
    grd=[c for c in countries['GRD']['creditors'] if c['code']=='994']
    assert math.fsum(c['value'] for c in grd)==21_868_185.2
    assert sum(c['roundingAdjustmentUSD'] for c in grd)==pytest.approx(185.2)
    assert rounding_tolerance(21_868_185.2,evidence['GRD']['rows'])==1000

def test_reported_zero_category_is_not_invented_as_a_positive_piece(evidence,countries):
    assert any(r['type']=='private' and r['amountThousands']==0 for r in evidence['HND']['rows'])
    assert [c['type'] for c in countries['HND']['creditors'] if c['code']=='994']==['bilateral']

def test_empty_belize_table_stays_other_and_is_not_unallocated(evidence,countries):
    rows,reason,_=parse_snapshot((ROOT/evidence['BLZ']['sourceFile']).read_bytes())
    assert rows==[] and 'Empty country table' in reason
    c=next(c for c in countries['BLZ']['creditors'] if c['code']=='994')
    assert c['value']==269_158_000 and c['type']=='other'
    assert c['name']=='Multiple Lenders' and c['code']!='UNALLOCATED'
    assert c['classificationStatus']=='unresolved'

def test_nonreconciling_supplemental_amounts_are_not_applied(evidence):
    entry=copy.deepcopy(evidence['BGD']);entry['rows'][0]['amountThousands']+=10_000
    result,report=classify('BGD',entry['originalAmountUSD'],entry)
    assert report['status']=='unresolved' and result[0]['type']=='other'
    assert result[0]['value']==entry['originalAmountUSD']
    assert 'do not reconcile' in report['notes']

@pytest.mark.parametrize('field,value',[('year',2024),('units','US$ millions'),('status','unavailable')])
def test_wrong_year_units_or_unavailable_evidence_cannot_classify(evidence,field,value):
    entry=copy.deepcopy(evidence['LCA']);entry[field]=value
    result,report=classify('LCA',entry['originalAmountUSD'],entry)
    assert report['status']=='unresolved' and result[0]['type']=='other'

def test_changed_original_balance_is_not_silently_reclassified(evidence):
    entry=evidence['CAF'];result,report=classify('CAF',entry['originalAmountUSD']+10_000,entry)
    assert result[0]['type']=='other' and 'has changed' in report['notes']

def test_changed_evidence_hash_fails_closed(tmp_path,evidence):
    entry=copy.deepcopy(evidence['CAF']);entry['sourceFile']='source.html'
    (tmp_path/'data').mkdir();(tmp_path/'source.html').write_text('changed')
    (tmp_path/'data/multiple-lenders-classification.json').write_text(json.dumps({'countries':{'CAF':entry}}))
    loaded=load_evidence(tmp_path)
    assert loaded['CAF']['status']=='unavailable'
    assert classify('CAF',entry['originalAmountUSD'],loaded['CAF'])[0][0]['type']=='other'

def test_parser_does_not_substitute_a_different_year(evidence):
    content=(ROOT/evidence['ZMB']['sourceFile']).read_bytes().replace(b'>2025<',b'>2020<')
    rows,reason,_=parse_snapshot(content)
    assert rows==[] and '2025' in reason
