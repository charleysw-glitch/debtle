"""Checks real workbook parsing and independent source-to-output invariants."""
import importlib.util
import json
import math
from pathlib import Path
import pandas as pd
import pytest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('importer',ROOT/'scripts/preprocess_ids.py')
ids=importlib.util.module_from_spec(spec);spec.loader.exec_module(ids)

@pytest.fixture(scope='module')
def raw():return ids.read_workbook(ROOT/'data/source/P_Data_Extract_From_International_Debt_Statistics.xlsx')
@pytest.fixture(scope='module')
def dataset():return json.loads((ROOT/'src/data/debt.json').read_text())
@pytest.fixture(scope='module')
def mapping():return json.loads((ROOT/'data/creditor-classification.json').read_text())
@pytest.fixture(scope='module')
def geo():return json.loads((ROOT/'src/data/geography.json').read_text())['countries']

def test_workbook_structure_and_actual_coverage(raw):
    assert len(raw)==81472
    assert raw['Country Code'].nunique()==134
    assert raw['Counterpart-Area Code'].nunique()==304
    assert set(raw['Series Code'])=={ids.PPG,ids.IMF}
    assert 'DT.DOD.DIMF.CD' not in set(raw['Series Code'])
    assert raw['value'].isna().sum()==77204
    assert (raw['value']==0).sum()==213

def test_missing_and_zero_are_distinct():
    assert ids.number('..') is None
    assert ids.number('') is None
    assert ids.number(None) is None
    assert ids.number(float('nan')) is None
    assert ids.number(0)==0
    assert ids.number('0')==0
    assert ids.number(4_200_000_000)==4_200_000_000
    with pytest.raises(ValueError):ids.number(-1)
    with pytest.raises(ValueError):ids.number('not debt')

def test_only_individual_countries(dataset):
    codes={c['iso3'] for c in dataset['countries']}
    assert len(codes)==120
    assert not codes & ids.AGGREGATES
    assert 'LDC' not in codes
    assert 'XKX' in codes

@pytest.mark.parametrize('code',['GHA','KEN','ZMB','KHM','ECU','ARG','SRB','TUR','BOL'])
def test_specific_source_reconciliation(code,raw,dataset):
    c=next(c for c in dataset['countries'] if c['iso3']==code)
    rows=raw[raw['Country Code']==code]
    def value(series,counterpart):return rows[(rows['Series Code']==series)&(rows['Counterpart-Area Code']==counterpart)]['value'].iloc[0]
    official=value(ids.PPG,'WLD');imf=value(ids.IMF,'907')
    assert c['ppgTotal']==official
    assert c['imfCredit']==imf==value(ids.IMF,'WLD')
    assert c['totalDebt']==official+imf
    assert sum(x['type']=='imf' for x in c['creditors'])==1
    assert next(x for x in c['creditors'] if x['type']=='imf')['value']==imf
    assert not any(x['code']=='WLD' for x in c['creditors'])
    assert math.fsum(x['value'] for x in c['creditors'])==pytest.approx(c['totalDebt'],abs=0.01)
    assert math.fsum(x['share'] for x in c['creditors'])==pytest.approx(100,abs=1e-8)

def test_known_real_amounts(dataset):
    c={c['iso3']:c for c in dataset['countries']}
    assert c['GHA']['ppgTotal']==26_546_486_201.9
    assert c['GHA']['imfCredit']==3_904_567_565.8
    assert c['ARG']['imfCredit']==57_230_153_165.2
    assert c['KHM']['imfCredit']==0
    assert c['SRB']['unallocatedDebt']==pytest.approx(1_000_000_000)
    assert c['TUR']['unallocatedDebt']==pytest.approx(144_458_025)
    assert c['BOL']['unallocatedDebt']==pytest.approx(5_011_010.8)
    assert {x['iso3'] for x in c.values() if x['unallocatedDebt']>0}=={'SRB','TUR','BOL'}

def test_all_creditor_balances_are_copied_from_source(raw,dataset):
    balances={(r['Country Code'],r['Series Code'],r['Counterpart-Area Code']):r['value'] for _,r in raw.iterrows()}
    for c in dataset['countries']:
        assert len({v['id'] for v in c['creditors']})==len(c['creditors'])
        for v in c['creditors']:
            if v['code']=='UNALLOCATED':continue
            series=ids.IMF if v['type']=='imf' else ids.PPG
            assert v['value']==balances[(c['iso3'],series,v['code'])]
            assert v['share']==pytest.approx(v['value']/c['totalDebt']*100)
        assert math.fsum(v['share'] for v in c['creditors'])==pytest.approx(100,abs=1e-8)
        assert c['validationStatus'] in {'valid','valid_with_notes'}
        assert -90<=c['centroid']['lat']<=90
        assert -180<=c['centroid']['lon']<=180

@pytest.mark.parametrize('code,category',[('730','bilateral'),('701','bilateral'),('004','bilateral'),('801','bilateral'),('820','bilateral'),('905','multilateral'),('901','multilateral'),('913','multilateral'),('915','multilateral'),('909','multilateral'),('988','multilateral'),('019','multilateral'),('BND','private'),('994','other'),('922','other'),('896','other'),('907','imf')])
def test_explicit_classification(mapping,code,category):assert mapping[code]['type']==category

def test_material_overcount_quarantined(raw,mapping,geo):
    altered=raw[raw['Country Code']=='GHA'].copy()
    at=(altered['Series Code']==ids.PPG)&(altered['Counterpart-Area Code']=='WLD')
    altered.loc[at,'value']=1
    _,report=ids.process_country('GHA',altered,mapping,geo)
    assert not report['eligible']
    assert report['validation_status']=='review'
    assert 'exceed official' in report['warnings']

def test_imf_mismatch_quarantined(raw,mapping,geo):
    altered=raw[raw['Country Code']=='GHA'].copy()
    altered.loc[(altered['Series Code']==ids.IMF)&(altered['Counterpart-Area Code']=='WLD'),'value']=1
    _,report=ids.process_country('GHA',altered,mapping,geo)
    assert not report['eligible']
    assert 'IMF 907 / WLD mismatch' in report['warnings']

def test_missing_imf_is_not_assumed_zero(raw,mapping,geo):
    altered=raw[raw['Country Code']=='KHM'].copy()
    altered.loc[(altered['Series Code']==ids.IMF)&(altered['Counterpart-Area Code']=='907'),'value']=float('nan')
    _,report=ids.process_country('KHM',altered,mapping,geo)
    assert not report['eligible']
    assert 'not assumed zero' in report['warnings']

def test_small_rounding_difference_is_not_rescaled(raw,mapping,geo):
    altered=raw[raw['Country Code']=='GHA'].copy()
    at=(altered['Series Code']==ids.PPG)&(altered['Counterpart-Area Code']=='WLD')
    altered.loc[at,'value']+=0.001
    c,report=ids.process_country('GHA',altered,mapping,geo)
    assert report['eligible']
    assert c['unallocatedDebt']==0
    assert not any(x['code']=='UNALLOCATED' for x in c['creditors'])

def test_frozen_pool_matches_reliable_countries(dataset):
    pool=json.loads((ROOT/'src/data/daily-pool-v1.json').read_text())
    assert pool['version']=='ids-2025-v1'
    assert set(pool['countries'])=={c['iso3'] for c in dataset['countries']}
    assert len(pool['countries'])==len(set(pool['countries']))
