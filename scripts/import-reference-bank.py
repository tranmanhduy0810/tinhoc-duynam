"""Import the publicly distributed TinHocKP training bank; preserve all content and attribution.

The upstream README and HUONG_DAN_GITHUB.md describe copying and deploying the
project for students. We retain source attribution and use our own app/branding.
JSON is parsed as data; downloaded JavaScript is never executed.
"""
import json
import hashlib
import re
import urllib.request
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

root = Path(__file__).resolve().parent.parent
base = 'https://tinhockp.github.io/tinhoccoban/'
source = root / 'artifacts/reference-questions.js'
source.parent.mkdir(exist_ok=True)
raw = urllib.request.urlopen(base + 'js/questions.js', timeout=30).read()
text = raw.decode('utf-8-sig')
match = re.fullmatch(r'\s*window\.DEFAULT_QUESTION_BANK\s*=\s*(\[.*\])\s*;?\s*', text[text.index('window.DEFAULT_QUESTION_BANK'):], re.S)
if not match:
    raise ValueError('Unexpected bank format; no script is executed.')
upstream = json.loads(match.group(1))
assert len(upstream) == 300
assert len({q['id'] for q in upstream}) == 300
for module in range(1, 7):
    assert sum(q['module'] == module for q in upstream) == 50

current = json.loads((root / 'site/data/questions.json').read_text(encoding='utf-8'))
topics = current['topics']
mapping = dict(zip(range(1, 7), ['basics', 'computer', 'internet', 'word', 'excel', 'powerpoint']))
images = sorted({q['imageUrl'] for q in upstream if q.get('imageUrl')})
def download_image(relative):
    if not re.fullmatch(r'assets/images/[a-zA-Z0-9_-]+\.(jpg|png|jpeg|webp|gif)', relative):
        raise ValueError('Unexpected asset path')
    data = urllib.request.urlopen(base + relative, timeout=30).read()
    if len(data) < 50 or data.lstrip().startswith(b'<!'):
        raise ValueError('Invalid image response')
    destination = root / 'site' / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return {'path': relative, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
with ThreadPoolExecutor(max_workers=4) as pool:
    assets = list(pool.map(download_image, images))
questions = []
for q in upstream:
    assert 2 <= len(q['options']) <= 4 and 0 <= q['answer'] < len(q['options'])
    record = {'id': f'tinhockp-{q["id"]:03}', 'topicId': mapping[q['module']], 'text': q['question'], 'options': q['options'], 'answer': q['answer'], 'explanation': q['explanation']}
    if q.get('imageUrl'):
        record['imageUrl'] = q['imageUrl']
    questions.append(record)

# Preserve the original local prototype bank once before replacing it.
backup = root / 'artifacts/prototype-questions-120.json'
if len(current['questions']) == 120 and not backup.exists():
    backup.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding='utf-8')
source.write_bytes(raw)
(root / 'site/data/questions.json').write_text(json.dumps({'version': 1, 'topics': topics, 'questions': questions}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
manifest = {'source': base + 'js/questions.js', 'repository': 'https://github.com/TinHocKP/tinhoccoban', 'retrievedAt': datetime.now(timezone.utc).isoformat(), 'sourceSha256': hashlib.sha256(raw).hexdigest(), 'count': len(questions), 'moduleCounts': {str(m): sum(q['module'] == m for q in upstream) for m in range(1, 7)}, 'images': assets, 'variableOptions': [{'sourceId': q['id'], 'count': len(q['options'])} for q in upstream if len(q['options']) != 4]}
(root / 'site/data/source-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'questions': len(questions), 'modules': manifest['moduleCounts'], 'images': len(assets), 'variableOptions': manifest['variableOptions']}, ensure_ascii=False))
