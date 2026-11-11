"""Derive local geographic centroids from Natural Earth 1:50m admin-0 polygons.
Uses area centroids of lon/lat polygons (not capitals); dateline polygons are
unwrapped before centroiding. Natural Earth data are in the public domain.
"""
import json
from pathlib import Path
from shapely.geometry import shape
from shapely.ops import transform
import pycountry

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/source/ne_50m_admin_0_countries.geojson'
URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'

def build():
    geo = {}
    for f in json.loads(SOURCE.read_text())['features']:
        p = f['properties']
        code = p.get('ADM0_A3')
        # Natural Earth uses a few non-ISO admin codes.
        code = {'SDS':'SSD','KOS':'XKX'}.get(code,code)
        country = pycountry.countries.get(alpha_3=code)
        if not country and code != 'XKX':
            continue
        geom = shape(f['geometry'])
        # Fiji and other countries cross the antimeridian. Avoid a centroid
        # on the opposite side of Earth from their landmass.
        dateline = geom.bounds[2]-geom.bounds[0] > 180
        if dateline:
            geom = transform(lambda x,y,z=None: (x+360 if x<0 else x,y), geom)
        center = geom.centroid
        lon = (center.x + 180) % 360 - 180
        geo[code] = {'lat':round(center.y,6),'lon':round(lon,6),'iso2':country.alpha_2 if country else 'XK', 'sourceName':p['ADMIN']}
    result = {'source':'Natural Earth 1:50m Admin 0 Countries, version 5.1.1', 'url':URL,
        'license':'Public domain', 'method':'Area-weighted planar centroids of Natural Earth WGS84 polygons, with antimeridian unwrapping; not capital coordinates.', 'countries':dict(sorted(geo.items()))}
    (ROOT/'src/data/geography.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(f'Wrote {len(geo)} country centroids')
if __name__ == '__main__':
    build()
