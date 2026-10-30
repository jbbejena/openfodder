"""GPL-3.0-or-later candidate integrity helpers. Packaging never approves a release."""
import hashlib
import io
import json
import re
import zipfile
from pathlib import Path
from web_artifact import REQUIRED, require, safe_name, verify_payload, zip_files

TOOLS = {'tools/package-web-candidate.py', 'tools/web_candidate.py', 'tools/web_artifact.py'}
TOP = {'candidate.json', 'README.txt', 'SHA256SUMS'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def json_bytes(value):
    return (json.dumps(value, indent=2, sort_keys=True) + '\n').encode()


def deterministic_zip(files):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(files.items()):
            safe_name(name)
            entry = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return output.getvalue()


def internal_dist(files, info):
    """Internal consistency without Git; creation separately checks the real Git snapshot."""
    source = zip_files(files['source.zip'])
    required = {'openfodder/COPYING', 'openfodder/scripts/build-web.sh',
                'openfodder/Run/Scripts/COPYING', 'openfodder/web/openfodder.ini'}
    require(required <= set(source), 'Incomplete source archive')
    require(all(name.startswith('openfodder/') and
                (not name.startswith('openfodder/Run/') or name.startswith('openfodder/Run/Scripts/'))
                for name in source), 'Unexpected source/data directory')
    support = {'/' + name.removeprefix('openfodder/Run/'): data for name, data in source.items()
               if name.startswith('openfodder/Run/Scripts/')}
    support['/openfodder.ini'] = source['openfodder/web/openfodder.ini']
    return verify_payload(files, source, support, info['commit'], info['data'], info['scripts'])


def make_candidate(files, info, tools, producer_commit, previous=None):
    require(set(tools) == TOOLS, 'Missing standalone verification tools')
    require(re.fullmatch('[0-9a-f]{40}', producer_commit) is not None, 'Full packager source commit required')
    internal_dist(files, info)
    payload = {'dist/' + name: data for name, data in files.items()}
    payload.update(tools)
    content = json.loads(files['content-manifest.json'])
    manifest = {
        'format': 'openfodder-mobile-candidate', 'version': 1, 'approval': 'UNAPPROVED',
        'acceptance': {'physical_iPhone': 'NOT ESTABLISHED BY THIS PACKAGE',
                       'recorded_device_acceptance': None,
                       'checklist': info['repository'] + '/blob/' + info['commit'] + '/docs/mobile/PLAYTEST.md'},
        'build': info, 'producer_commit': producer_commit,
        'content': {'id': content['id'], 'data_revision': content['data_revision'],
                    'files': len(content['files']), 'logical_bytes': sum(f['size'] for f in content['files']),
                    'route': 'Pinned upstream or player-supplied files; game assets are not in this bundle'},
        'previous_candidate': previous,
        'files': {name: {'bytes': len(data), 'sha256': digest(data)} for name, data in sorted(payload.items())},
    }
    payload['candidate.json'] = json_bytes(manifest)
    previous_note = ('Previous bundle: ' + previous['filename'] + '\nSource: ' + previous['commit'] +
                     '\nSHA-256: ' + previous['sha256'] + '\n' if previous else
                     'No previous bundle is attached or implicitly selected. Retain the known working bundle separately.\n')
    payload['README.txt'] = (
        'OPEN FODDER MOBILE CANDIDATE — UNAPPROVED\n'
        f"Source: {info['repository']} @ {info['commit']}\n"
        f"Packager source: {producer_commit}\n"
        'This package verifies integrity, not iPhone acceptance or release approval.\n'
        'No game assets are included. Engine/Scripts GPL source: dist/source.zip. Notices: dist/notices/.\n'
        'Packager/verifier GPL-3.0-or-later source: tools/; license: dist/notices/COPYING.\n\n'
        'Keep the ZIP and adjacent .sha256 file together. Check the whole-ZIP digest against the trusted CI/PR record.\n'
        'From a source checkout, or this bundle after trusted extraction:\n'
        '  python3 tools/package-web-candidate.py --verify /path/to/candidate.zip\n'
        '  python3 tools/package-web-candidate.py --verify /path/to/candidate.zip --extract /path/to/NEW-directory\n'
        'The source-checkout path is scripts/package-web-candidate.py. Verification/extraction needs Python only, not Git/SDK.\n'
        'Extraction refuses an existing destination. Serve ONLY its dist directory:\n'
        '  python3 -m http.server 8080 --directory /path/to/NEW-directory/dist\n'
        'Use localhost for local testing, HTTPS and application/wasm for hosting. Verify the visible build and menu/map.\n'
        'Future authorized deployment must replace the complete dist atomically; retain the previous artifact/version.\n'
        'An existing tab keeps its running engine until reload. Loading demo files is a separate action.\n\n'
        'ROLLBACK\n' + previous_note +
        'Verify the previous ZIP/checksum, extract into another NEW directory, serve its dist, and confirm its own full build ID.\n'
        'Keep checkpoints/backups; never clear website data merely to change the engine build.\n'
        'Publishing, tags, releases and accepted-baseline promotion require separate authorization/evidence.\n'
        'Checksums are not signatures; this unsigned candidate does not establish phone readiness.\n'
    ).encode()
    payload['SHA256SUMS'] = ''.join(f'{digest(data)}  {name}\n' for name, data in sorted(payload.items())).encode()
    return deterministic_zip(payload)


def verify_candidate(data):
    files = zip_files(data)
    require(TOP <= set(files) and {name for name in files if name.startswith('tools/')} == TOOLS,
            'Missing or unexpected candidate metadata/tools')
    require(all(name in TOP or name in TOOLS or name.startswith('dist/') for name in files), 'Unexpected candidate payload')
    manifest = json.loads(files['candidate.json'])
    require(manifest.get('format') == 'openfodder-mobile-candidate' and type(manifest.get('version')) is int and manifest['version'] == 1,
            'Unsupported candidate format')
    require(isinstance(manifest.get('producer_commit'), str) and re.fullmatch('[0-9a-f]{40}', manifest['producer_commit']),
            'Invalid packager source identity')
    require(manifest.get('approval') == 'UNAPPROVED' and
            manifest.get('acceptance', {}).get('recorded_device_acceptance') is None and
            manifest.get('acceptance', {}).get('physical_iPhone') == 'NOT ESTABLISHED BY THIS PACKAGE',
            'Candidate cannot claim acceptance/approval')
    sums = {}
    for line in files['SHA256SUMS'].decode().splitlines():
        require(len(line) >= 67 and line[64:66] == '  ' and re.fullmatch('[0-9a-f]{64}', line[:64]), 'Malformed checksums')
        name = safe_name(line[66:])
        require(name not in sums, 'Duplicate checksum entry')
        sums[name] = line[:64]
    require(set(sums) == set(files) - {'SHA256SUMS'}, 'Checksum coverage mismatch')
    require(all(digest(files[name]) == sha for name, sha in sums.items()), 'Candidate checksum mismatch')
    payload = set(files) - TOP
    require(set(manifest['files']) == payload, 'Manifest coverage mismatch')
    require(all(manifest['files'][name] == {'bytes': len(files[name]), 'sha256': digest(files[name])}
                for name in payload), 'Manifest hash/size mismatch')
    dist = {name.removeprefix('dist/'): value for name, value in files.items() if name.startswith('dist/')}
    info = internal_dist(dist, manifest['build'])
    require(info == manifest['build'], 'Candidate/build identity mismatch')
    require(re.fullmatch('[0-9a-f]{40}', info['commit']) is not None, 'Invalid full build commit')
    content = json.loads(dist['content-manifest.json'])
    require(manifest['content'] == {'id': content['id'], 'data_revision': content['data_revision'],
        'files': len(content['files']), 'logical_bytes': sum(f['size'] for f in content['files']),
        'route': 'Pinned upstream or player-supplied files; game assets are not in this bundle'}, 'Wrong content identity')
    require(content['data_revision'] == info['data'], 'Content/data revision mismatch')
    return files, manifest


def verified_archive(path, expected_digest=None, expected_commit=None):
    path = Path(path)
    data = path.read_bytes()
    if expected_digest is None:
        sidecar = Path(str(path) + '.sha256').read_text().strip()
        require(sidecar == f'{digest(data)}  {path.name}', 'ZIP/sidecar checksum mismatch')
    else:
        require(re.fullmatch('[0-9a-f]{64}', expected_digest) is not None and digest(data) == expected_digest,
                'Wrong expected archive digest')
    files, manifest = verify_candidate(data)
    require(expected_commit is None or manifest['build']['commit'] == expected_commit, 'Wrong expected source commit')
    return files, manifest, digest(data)


def extract_new(files, destination):
    destination = Path(destination)
    require(not destination.exists() and not destination.is_symlink(), 'Extraction destination already exists')
    for name in files:
        safe_name(name)
    destination.mkdir(parents=True)
    for name, data in files.items():
        safe_name(name)
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('xb') as output:
            output.write(data)
