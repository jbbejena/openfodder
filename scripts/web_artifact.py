"""Validate the pinned, asset-free web dist against working or historical source."""
import io
import json
import re
import subprocess
import tarfile
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = {'index.html', 'index.js', 'index.wasm', 'index.data', 'bootstrap.js',
            'style.css', 'engine-bridge.js', 'lifecycle.js', 'touch-controls.js',
            'phone-shell.js', 'mission-flow.js', 'checkpoints.js', 'performance.js',
            'input-harness.js', 'build-info.json', 'content-manifest.json', 'source.zip', 'SOURCE.txt'}
PINS = {'emscripten': '4.0.23', 'emscripten_revision': '7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed',
        'emsdk': 'c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56',
        'sdk_bundle': 'aaa43392544d695232b70eda706d751f18980c2a',
        'sdl': '3.2.22', 'cmake': '3.31.6', 'ninja': '1.11.1'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def safe_name(name):
    path = PurePosixPath(name)
    require(bool(name) and not path.is_absolute() and '\\' not in name and
            not any(p in ('', '.', '..') for p in name.split('/')) and ':' not in name,
            f'Unsafe archive path: {name}')
    return name


def zip_files(data):
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()
            require(len(entries) <= 10000 and sum(e.file_size for e in entries) <= 256 * 1024 * 1024,
                    'Archive exceeds verification limits')
            names = [entry.filename for entry in entries]
            require(len(names) == len(set(names)), 'Duplicate archive entries')
            result = {}
            for entry in entries:
                safe_name(entry.filename)
                mode = entry.external_attr >> 16
                require(not entry.is_dir() and (mode & 0o170000) in (0, 0o100000),
                        'Only regular archive files are supported')
                result[entry.filename] = archive.read(entry)
            return result
    except (zipfile.BadZipFile, RuntimeError) as error:
        raise ValueError('Invalid or corrupted ZIP') from error


def git(*args, root=ROOT):
    return subprocess.check_output(['git', *args], cwd=root)


def snapshot(root, revision):
    result = {}
    with tarfile.open(fileobj=io.BytesIO(git('archive', '--format=tar', revision, root=root))) as archive:
        for entry in archive:
            if entry.isdir():
                continue
            require(entry.isfile(), f'Unsupported source entry: {entry.name}')
            result[safe_name(entry.name)] = archive.extractfile(entry).read()
    return result


def source_at(revision, *, working=False, root=ROOT):
    data_revision = git('rev-parse', revision + ':Run', root=root).decode().strip()
    scripts_revision = git('rev-parse', data_revision + ':Scripts', root=root / 'Run').decode().strip()
    scripts = snapshot(root / 'Run/Scripts', scripts_revision)
    if working:
        names = git('ls-files', '-z', '--cached', '--others', '--exclude-standard', root=root).decode().split('\0')
        engine = {name: (root / name).read_bytes() for name in names
                  if name and name != 'Run' and not name.startswith('Run/') and (root / name).is_file()}
    else:
        engine = snapshot(root, revision)
    source = {'openfodder/' + name: data for name, data in engine.items()}
    source.update({'openfodder/Run/Scripts/' + name: data for name, data in scripts.items()})
    support = {'/Scripts/' + name: data for name, data in scripts.items()}
    support['/openfodder.ini'] = engine['web/openfodder.ini']
    return source, support, data_revision, scripts_revision


def verify_payload(files, source, support, revision, data_revision, scripts_revision, *, allow_dirty=False):
    top = {name for name in files if '/' not in name}
    require(top == REQUIRED, 'Unexpected or missing web artifact files')
    require(all('/' not in name or name.startswith('notices/') for name in files), 'Unexpected web directory')
    info = json.loads(files['build-info.json'])
    require(info['commit'] == revision, 'Stale/wrong build identity')
    require(info['dirty'] is False or allow_dirty, 'Publish a committed build, not a dirty tree')
    require(info['repository'] == 'https://github.com/jbbejena/openfodder', 'Wrong source repository')
    require(info['data'] == data_revision and info['scripts'] == scripts_revision, 'Wrong dependency revisions')
    require(all(info.get(key) == value for key, value in PINS.items()), 'Unexpected web toolchain pins')
    require(files['index.wasm'].startswith(b'\0asm'), 'Invalid WebAssembly artifact')
    sizes = {name: len(data) for name, data in files.items()
             if '/' not in name and Path(name).suffix in {'.html', '.js', '.wasm', '.data', '.css'}}
    require(info['runtime_files_bytes'] == sizes, 'Stale runtime size metadata')
    require(not any(name.lower().endswith('.ofdata') for name in source), 'Player game packs cannot be distributed')
    require(zip_files(files['source.zip']) == source, 'Missing, extra or mismatched matching source')
    require(files['content-manifest.json'] == source['openfodder/web/content-manifest.json'], 'Wrong content manifest')
    for name in REQUIRED - {'index.html', 'index.js', 'index.wasm', 'index.data', 'build-info.json', 'source.zip', 'SOURCE.txt'}:
        require(files[name] == source['openfodder/web/' + name], f'Mismatched browser source: {name}')
    # The tested SDK minifies JSON object keys in the generated preload call.
    # Decode that limited literal without evaluating JavaScript.
    js = files['index.js'].decode()
    start = js.find('loadPackage({')
    require(start >= 0, 'Missing Emscripten preload metadata')
    literal = js[start + len('loadPackage('):]
    literal = re.sub(r'(?<=[{,])(files|filename|start|end|remote_package_size):', r'"\1":', literal)
    metadata, end = json.JSONDecoder().raw_decode(literal)
    require(literal[end:].startswith(')'), 'Invalid preload metadata')
    entries = metadata['files']
    require(isinstance(entries, list) and all(isinstance(e, dict) and
            set(e) == {'filename', 'start', 'end'} and type(e['start']) is int and
            type(e['end']) is int for e in entries), 'Invalid preload file entries')
    require(len(entries) == len(support) and {e['filename'] for e in entries} == set(support),
            'Preloaded data contains unexpected or missing files')
    require(metadata['remote_package_size'] == len(files['index.data']), 'Wrong support payload size')
    offset = 0
    for entry in sorted(entries, key=lambda item: item['start']):
        require(type(entry['start']) is int and type(entry['end']) is int and
                entry['start'] == offset and entry['end'] >= offset, 'Invalid support file offsets')
        require(files['index.data'][offset:entry['end']] == support[entry['filename']],
                'Support data does not match pinned GPL Scripts/config')
        offset = entry['end']
    require(offset == len(files['index.data']), 'Unaccounted bytes in support data')
    notices = {name.removeprefix('openfodder/'): data for name, data in source.items()
               if '/' not in name.removeprefix('openfodder/') and name.startswith('openfodder/COPYING')}
    expected = {'notices/' + name for name in notices} | {'notices/Scripts-GPL.txt', 'notices/Emscripten.txt', 'notices/SDL.txt'}
    require({name for name in files if name.startswith('notices/')} == expected, 'Missing or unexpected notices')
    require(all(files['notices/' + name] == data for name, data in notices.items()), 'Mismatched engine notices')
    require(files['notices/Scripts-GPL.txt'] == support['/Scripts/COPYING'], 'Mismatched Scripts license')
    require(files['notices/Emscripten.txt'] and files['notices/SDL.txt'], 'Empty dependency license')
    require(revision.encode() in files['SOURCE.txt'] and b'source.zip' in files['SOURCE.txt'], 'Missing source identity/offer')
    return info


def read_dist(dist):
    require(dist.is_dir() and not dist.is_symlink(), 'Supply a real dist directory')
    files = {}
    for path in dist.rglob('*'):
        require(not path.is_symlink(), 'Symlinks are not supported in dist')
        if path.is_file():
            files[path.relative_to(dist).as_posix()] = path.read_bytes()
        elif path.is_dir():
            require(path.relative_to(dist).as_posix() == 'notices', 'Unexpected dist directory')
    return files


def verify_dist(dist, *, revision=None, allow_dirty=False, root=ROOT):
    require(not (revision and allow_dirty), '--ref cannot validate dirty historical source')
    if revision is not None:
        require(re.fullmatch('[0-9a-f]{40}', revision) is not None, '--ref requires a full commit')
    else:
        revision = git('rev-parse', 'HEAD', root=root).decode().strip()
        require(allow_dirty or not git('status', '--porcelain', '--untracked-files=all', root=root).strip(),
                'Commit source changes before verifying a publishable artifact')
    files = read_dist(dist)
    source, support, data_revision, scripts_revision = source_at(revision, working=allow_dirty, root=root)
    info = verify_payload(files, source, support, revision, data_revision, scripts_revision, allow_dirty=allow_dirty)
    return files, info
