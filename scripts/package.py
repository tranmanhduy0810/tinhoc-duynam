"""Create handoff archives from an explicit allowlist; never include workspace data."""
from pathlib import Path
import zipfile
import json

root = Path(__file__).resolve().parent.parent
output = root.parent / 'output'
output.mkdir(exist_ok=True)
include = ['site', 'scripts', 'tests', '.github', 'dist', 'package.json', 'package-lock.json', 'playwright.config.mjs', '.gitignore', 'README.md', 'QA.md', 'MO_WEBSITE.bat', 'CAP_NHAT_WEBSITE.bat']
source_zip = output / 'Tin_hoc_Duy_Nam_tron_bo.zip'
deploy_zip = output / 'Tin_hoc_Duy_Nam_dang_web.zip'
with zipfile.ZipFile(source_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for item in include:
        candidate = root / item
        files = candidate.rglob('*') if candidate.is_dir() else [candidate]
        for file in files:
            if file.is_file() and '__pycache__' not in file.parts:
                archive.write(file, Path('tinhoc-duynam') / file.relative_to(root))
with zipfile.ZipFile(deploy_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in (root / 'dist').rglob('*'):
        if file.is_file():
            archive.write(file, file.relative_to(root / 'dist'))
for file in (source_zip, deploy_zip):
    with zipfile.ZipFile(file) as archive:
        assert archive.testzip() is None
        assert not any('node_modules/' in p or 'server.log' in p or 'artifacts/' in p for p in archive.namelist())
    print(json.dumps({'file': str(file), 'bytes': file.stat().st_size}, ensure_ascii=False))
