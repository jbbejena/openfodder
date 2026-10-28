#!/usr/bin/env python3
"""Stage only GPL Scripts/config. Package matching source; never stage game data."""
import argparse
import json
import shutil
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / 'build-web'
DIST = BUILD / 'cmake/dist'
DATA = '070a6086c62164e859fc3274b75b5f536fa9d902'
SCRIPTS = 'dad04730860bcdd1189aa8562860e379b0f5d783'


def git(*args, cwd=ROOT):
    return subprocess.check_output(['git', *args], cwd=cwd).decode().strip()


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_bytes() != data:
        path.write_bytes(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package', action='store_true')
    args = parser.parse_args()
    for folder, revision in [('Run', DATA), ('Run/Scripts', SCRIPTS)]:
        if git('rev-parse', 'HEAD', cwd=ROOT / folder) != revision:
            raise SystemExit(f'{folder} must be at {revision}; use git submodule update --init --recursive')
        if git('status', '--porcelain', '--untracked-files=all', cwd=ROOT / folder):
            raise SystemExit(f'{folder} must be clean, including nested Scripts')
    scripts = git('ls-files', cwd=ROOT / 'Run/Scripts').splitlines()
    allowed = {Path('openfodder.ini')}
    for name in scripts:
        dest = Path('Scripts') / name
        allowed.add(dest)
        write(BUILD / 'runtime' / dest, (ROOT / 'Run/Scripts' / name).read_bytes())
    write(BUILD / 'runtime/openfodder.ini', (ROOT / 'web/openfodder.ini').read_bytes())
    # Remove stale files, e.g. an earlier locally staged asset. Never package Run wholesale.
    for p in (BUILD / 'runtime').rglob('*'):
        if p.is_file() and p.relative_to(BUILD / 'runtime') not in allowed:
            p.unlink()
    if not args.package:
        return
    DIST.mkdir(parents=True, exist_ok=True)
    metadata = {
        'repository': 'https://github.com/jbbejena/openfodder',
        'commit': git('rev-parse', 'HEAD'),
        'dirty': bool(git('status', '--porcelain', '--untracked-files=all')),
        'data': DATA, 'scripts': SCRIPTS, 'emscripten': '4.0.23',
        'emscripten_revision': '7a5d93b50f6a3a35e85a0d2fc9e667b8498e6aed',
        'emsdk': 'c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56',
        'sdk_bundle': 'aaa43392544d695232b70eda706d751f18980c2a',
        'sdl': '3.2.22', 'cmake': '3.31.6', 'ninja': '1.11.1',
        'content': 'Player-supplied Amiga Format Christmas Special; no game assets hosted',
    }
    write(DIST / 'build-info.json', (json.dumps(metadata, indent=2) + '\n').encode())
    for name in ['content-manifest.json', 'bootstrap.js', 'style.css']:
        write(DIST / name, (ROOT / 'web' / name).read_bytes())
    # Always distribute the complete engine/scripts source used, including dirty
    # working files during local development. Exact committed builds say dirty=false.
    with zipfile.ZipFile(DIST / 'source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in git('ls-files', '--cached', '--others', '--exclude-standard').splitlines():
            path = ROOT / name
            if path.is_file() and not name.startswith('Run/') and name != 'Run':
                archive.write(path, 'openfodder/' + name)
        for name in scripts:
            archive.write(ROOT / 'Run/Scripts' / name, 'openfodder/Run/Scripts/' + name)
    notices = DIST / 'notices'
    notices.mkdir(exist_ok=True)
    for path in ROOT.glob('COPYING*'):
        shutil.copyfile(path, notices / path.name)
    shutil.copyfile(ROOT / 'Run/Scripts/COPYING', notices / 'Scripts-GPL.txt')
    shutil.copyfile(BUILD / 'tools/emsdk/upstream/emscripten/LICENSE', notices / 'Emscripten.txt')
    shutil.copyfile(BUILD / 'cache/ports/sdl3/SDL-release-3.2.22/LICENSE.txt', notices / 'SDL.txt')
    write(DIST / 'SOURCE.txt', (
        f"Open Fodder, GPL-3.0-or-later. Build {metadata['commit']}, dirty={metadata['dirty']}\n"
        'Complete matching engine, browser shell, build scripts and GPL Scripts source: source.zip\n'
        'Game data is player-supplied and is not in this artifact. No data redistribution grant established.\n'
        'Build instructions: openfodder/docs/mobile/BUILD.md in source.zip\n'
        'Pinned system toolchain: https://github.com/emscripten-core/emsdk/tree/c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56\n'
        'SDL source: https://github.com/libsdl-org/SDL/tree/release-3.2.22 (zlib)\n'
        'Emscripten source: https://github.com/emscripten-core/emscripten/tree/4.0.23 (MIT/NCSA)\n'
        'License texts and bundled-source notices: notices/ and source.zip\n'
    ).encode())


if __name__ == '__main__':
    main()
