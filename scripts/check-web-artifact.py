#!/usr/bin/env python3
"""Fail publication if an asset or missing/mismatched source enters the artifact."""
import json
import argparse
import subprocess
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
dist = root / 'build-web/cmake/dist'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--allow-dirty', action='store_true', help='Local verification only')
args = parser.parse_args()
info = json.loads((dist / 'build-info.json').read_text())
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip()
assert info['commit'] == head, 'Stale build identity'
assert args.allow_dirty or not info['dirty'], 'Publish a committed build, not a dirty tree'
required = {'index.html', 'index.js', 'index.wasm', 'index.data', 'bootstrap.js',
            'style.css', 'engine-bridge.js', 'lifecycle.js', 'touch-controls.js', 'phone-shell.js', 'mission-flow.js', 'checkpoints.js', 'input-harness.js', 'build-info.json', 'content-manifest.json', 'source.zip', 'SOURCE.txt'}
assert required == {p.name for p in dist.iterdir() if p.is_file()}, 'Unexpected or missing artifact file'
assert {p.name for p in dist.iterdir() if p.is_dir()} == {'notices'}
assert (dist / 'index.wasm').read_bytes()[:4] == b'\0asm'
runtime = root / 'build-web/runtime'
support = [p for p in runtime.rglob('*') if p.is_file()]
scripts = subprocess.check_output(['git', 'ls-files'], cwd=root / 'Run/Scripts').decode().splitlines()
assert {p.relative_to(runtime).as_posix() for p in support} == {'openfodder.ini', *('Scripts/' + p for p in scripts)}
data = (dist / 'index.data').read_bytes()
assert len(data) == sum(p.stat().st_size for p in support), 'Data file contains unexpected bytes'
assert all(p.read_bytes() in data for p in support), 'Data file does not match runtime support'
with zipfile.ZipFile(dist / 'source.zip') as source:
    names = source.namelist()
    assert 'openfodder/scripts/build-web.sh' in names
    assert 'openfodder/COPYING' in names
    assert 'openfodder/Run/Scripts/COPYING' in names
    assert not any(n.startswith('openfodder/Run/') and not n.startswith('openfodder/Run/Scripts/') for n in names)
    assert all(not n.endswith('.ofdata') for n in names)
    for name in names:
        assert source.read(name) == (root / name.removeprefix('openfodder/')).read_bytes(), f'Stale source: {name}'
print(f"Artifact/source verified for {head}; {len(support)} GPL/config files, no game assets.")
