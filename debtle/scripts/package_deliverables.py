"""Package downloadable source and a self-contained static build. Run after build.
Generated archives exclude one another to prevent recursive packaging.
"""
from pathlib import Path
import shutil
import zipfile
ROOT=Path(__file__).resolve().parents[1]
TARGET=ROOT/'public/downloads'
SKIP={'.git','.venv','node_modules','dist','__pycache__','.pytest_cache','test-results','playwright-report','work'}

def package():
    TARGET.mkdir(parents=True,exist_ok=True)
    if not (ROOT/'dist/index.html').is_file():raise SystemExit('Run npm run build first')
    for src,dst in [('README.md','README.md'),('reports/quality-report.md','quality-report.md'),('reports/verification.md','verification.md'),('src/data/debt.json','debt.json'),('data/creditor-classification.json','creditor-classification.json')]:
        shutil.copyfile(ROOT/src,TARGET/dst)
    with zipfile.ZipFile(TARGET/'debtle-source.zip','w',zipfile.ZIP_DEFLATED) as z:
        # Walk only source directories; never descend into dependency or VCS trees.
        import os
        for base,dirs,files in os.walk(ROOT):
            dirs[:]=sorted(d for d in dirs if d not in SKIP)
            for name in sorted(files):
                p=Path(base)/name
                if name.startswith('.env') or name.endswith(('.zip','.tar.gz','.tsbuildinfo','.pyc')):continue
                z.write(p,Path('debtle')/p.relative_to(ROOT))
    with zipfile.ZipFile(TARGET/'debtle-static.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted((ROOT/'dist').rglob('*')):
            relative=p.relative_to(ROOT/'dist')
            if p.is_file() and 'downloads' not in relative.parts:z.write(p,relative)
        # Include the current source and docs. Exclude this archive itself, and
        # remove its own download link from the packaged project-files page.
        import re
        for p in sorted(TARGET.iterdir()):
            if not p.is_file() or p.name=='debtle-static.zip':continue
            if p.name=='index.html':
                page=re.sub(r'<a id="static-download".*?</a>', '', p.read_text(), flags=re.S)
                z.writestr('downloads/index.html',page)
            else:z.write(p,Path('downloads')/p.name)
    print('Created public/downloads/debtle-source.zip and debtle-static.zip. Rebuild to serve the updated files.')
if __name__=='__main__':package()
