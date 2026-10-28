#!/usr/bin/env python3
"""Create a local-only exact demo pack. Do NOT commit, host or upload this file."""
import base64
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'web/content-manifest.json').read_text())
files = {}
for item in manifest['files']:
    data = (root / 'Run' / item['path']).read_bytes()
    if len(data) != item['size'] or hashlib.sha256(data).hexdigest() != item['sha256']:
        raise SystemExit(f"Pinned content mismatch: {item['path']}")
    files[item['path']] = base64.b64encode(data).decode('ascii')
dest = root / 'build-web/local-only/christmas.ofdata'
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps({'id': manifest['id'], 'files': files}, separators=(',', ':')))
print(f'Local player file: {dest}\nDo not commit, host, or upload it. Copy privately to your device for local selection.')
