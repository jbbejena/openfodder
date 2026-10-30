"""Synthetic package fixtures; never contain game assets or establish gameplay acceptance."""
import copy
import io
import json
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

from web_artifact import PINS, REQUIRED, source_at, verify_dist, verify_payload, zip_files
from web_candidate import (TOOLS, deterministic_zip, digest, extract_new, json_bytes,
                           make_candidate, verified_archive, verify_candidate)

COMMIT, DATA, SCRIPTS = 'a' * 40, 'b' * 40, 'c' * 40


def fixture(data_revision=DATA, scripts_revision=SCRIPTS):
    content = {'id': 'synthetic-fixture', 'data_revision': data_revision,
               'files': [{'path': 'Data/example', 'size': 4, 'sha256': '0' * 64}]}
    source = {'openfodder/COPYING': b'Synthetic engine license fixture',
              'openfodder/scripts/build-web.sh': b'# Synthetic build fixture\n',
              'openfodder/web/openfodder.ini': b'[synthetic]\n',
              'openfodder/web/content-manifest.json': json_bytes(content),
              'openfodder/Run/Scripts/COPYING': b'Synthetic Scripts license fixture',
              'openfodder/Run/Scripts/test.js': b'// synthetic support\n'}
    files = {'index.html': b'<!doctype html>synthetic', 'index.wasm': b'\0asmsynthetic',
             'content-manifest.json': json_bytes(content)}
    for name in REQUIRED - {'index.html', 'index.js', 'index.wasm', 'index.data', 'build-info.json', 'source.zip', 'SOURCE.txt', 'content-manifest.json'}:
        files[name] = b'// synthetic ' + name.encode()
        source['openfodder/web/' + name] = files[name]
    support = {'/Scripts/COPYING': source['openfodder/Run/Scripts/COPYING'],
               '/Scripts/test.js': source['openfodder/Run/Scripts/test.js'],
               '/openfodder.ini': source['openfodder/web/openfodder.ini']}
    entries, offset = [], 0
    for name, value in support.items():
        entries.append({'filename': name, 'start': offset, 'end': offset + len(value)})
        offset += len(value)
    files['index.data'] = b''.join(support.values())
    files['index.js'] = ('loadPackage(' + json.dumps({'files': entries, 'remote_package_size': offset}) + ')').encode()
    files['source.zip'] = deterministic_zip(source)
    files.update({'notices/COPYING': source['openfodder/COPYING'],
                  'notices/Scripts-GPL.txt': support['/Scripts/COPYING'],
                  'notices/SDL.txt': b'Synthetic SDL license fixture',
                  'notices/Emscripten.txt': b'Synthetic compiler license fixture'})
    info = {'repository': 'https://github.com/jbbejena/openfodder', 'commit': COMMIT,
            'dirty': False, 'data': data_revision, 'scripts': scripts_revision, **PINS}
    info['runtime_files_bytes'] = {name: len(value) for name, value in files.items()
                                  if '/' not in name and Path(name).suffix in {'.html', '.js', '.wasm', '.data', '.css'}}
    files['build-info.json'] = json_bytes(info)
    files['SOURCE.txt'] = f'Synthetic {COMMIT} source.zip'.encode()
    tools = {name: b'# Synthetic verification fixture\n' for name in TOOLS}
    return files, info, source, support, tools


def repack(files):
    files = dict(files)
    files['SHA256SUMS'] = ''.join(f'{digest(value)}  {name}\n' for name, value in sorted(files.items())
                                if name != 'SHA256SUMS').encode()
    return deterministic_zip(files)


class CandidateTests(unittest.TestCase):
    def setUp(self):
        self.files, self.info, self.source, self.support, self.tools = fixture()
        self.archive = make_candidate(self.files, self.info, self.tools, COMMIT)

    def test_deterministic_and_never_approved(self):
        self.assertEqual(self.archive, make_candidate(self.files, self.info, self.tools, COMMIT))
        _, manifest = verify_candidate(self.archive)
        self.assertEqual(manifest['approval'], 'UNAPPROVED')
        self.assertIsNone(manifest['acceptance']['recorded_device_acceptance'])
        with zipfile.ZipFile(io.BytesIO(self.archive)) as archive:
            self.assertTrue(all(e.date_time == (1980, 1, 1, 0, 0, 0) for e in archive.infolist()))

    def test_modified_runtime_is_rejected(self):
        files = zip_files(self.archive)
        files['dist/index.wasm'] += b'corruption'
        with self.assertRaisesRegex(ValueError, 'checksum'):
            verify_candidate(deterministic_zip(files))

    def test_rehashed_false_approval_and_wrong_identity_are_rejected(self):
        for field in ['approval', 'identity']:
            files = zip_files(self.archive)
            manifest = json.loads(files['candidate.json'])
            if field == 'approval':
                manifest['approval'] = 'APPROVED'
            else:
                manifest['build']['commit'] = 'd' * 40
            files['candidate.json'] = json_bytes(manifest)
            with self.assertRaises(ValueError):
                verify_candidate(repack(files))

    def test_missing_source_or_source_edits_cannot_pass_git_comparison(self):
        for delete in [True, False]:
            files = dict(self.files)
            altered = dict(self.source)
            if delete:
                del altered['openfodder/scripts/build-web.sh']
            else:
                altered['openfodder/COPYING'] += b'edited'
            files['source.zip'] = deterministic_zip(altered)
            with self.assertRaisesRegex(ValueError, 'matching source'):
                verify_payload(files, self.source, self.support, COMMIT, DATA, SCRIPTS)

    def test_no_extra_assets_profiles_or_unaccounted_support_bytes(self):
        for name in ['demo.ofdata', 'notices/screenshot.png', 'profile/Cookies']:
            files = dict(self.files)
            files[name] = b'synthetic forbidden payload'
            with self.assertRaises(ValueError):
                make_candidate(files, self.info, self.tools, COMMIT)
        files = dict(self.files)
        files['index.data'] += b'extra'
        info = copy.deepcopy(self.info)
        info['runtime_files_bytes']['index.data'] += 5
        files['build-info.json'] = json_bytes(info)
        with self.assertRaisesRegex(ValueError, 'support payload size'):
            make_candidate(files, info, self.tools, COMMIT)

    def test_missing_notices_and_dirty_builds_fail(self):
        files = dict(self.files)
        del files['notices/SDL.txt']
        with self.assertRaisesRegex(ValueError, 'notices'):
            make_candidate(files, self.info, self.tools, COMMIT)
        info = dict(self.info, dirty=True)
        files = dict(self.files, **{'build-info.json': json_bytes(info)})
        with self.assertRaisesRegex(ValueError, 'dirty'):
            make_candidate(files, info, self.tools, COMMIT)

    def test_whole_zip_checksum_and_full_expected_commit(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'candidate.zip'
            path.write_bytes(self.archive)
            sidecar = Path(str(path) + '.sha256')
            sidecar.write_text(f'{digest(self.archive)}  candidate.zip\n')
            verified_archive(path, expected_commit=COMMIT)
            with self.assertRaisesRegex(ValueError, 'source commit'):
                verified_archive(path, expected_commit='d' * 40)
            sidecar.write_text('0' * 64 + '  candidate.zip\n')
            with self.assertRaisesRegex(ValueError, 'sidecar'):
                verified_archive(path)
            verified_archive(path, expected_digest=digest(self.archive))

    def test_traversal_duplicates_and_symlinks_fail_before_extraction(self):
        for name in ['../outside', '/absolute', 'dist/../outside', 'C:/outside', 'dist\\outside']:
            with self.assertRaises(ValueError):
                deterministic_zip({name: b'x'})
        for duplicate in [True, False]:
            stream = io.BytesIO()
            with zipfile.ZipFile(stream, 'w') as archive:
                entry = zipfile.ZipInfo('one')
                entry.create_system = 3
                entry.external_attr = (0o100644 if duplicate else 0o120777) << 16
                archive.writestr(entry, b'x')
                if duplicate:
                    archive.writestr(entry, b'again')
            with self.assertRaises(ValueError):
                zip_files(stream.getvalue())

    def test_extraction_never_overwrites(self):
        files, _ = verify_candidate(self.archive)
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'new'
            extract_new(files, target)
            self.assertEqual((target / 'dist/index.wasm').read_bytes(), self.files['index.wasm'])
            with self.assertRaisesRegex(ValueError, 'already exists'):
                extract_new({'dist/index.wasm': b'changed'}, target)
            self.assertEqual((target / 'dist/index.wasm').read_bytes(), self.files['index.wasm'])

    def test_previous_bundle_is_a_reference_not_an_implicit_approval(self):
        previous = {'filename': 'previous.zip', 'commit': 'd' * 40, 'sha256': 'e' * 64, 'approval': 'UNAPPROVED'}
        _, manifest = verify_candidate(make_candidate(self.files, self.info, self.tools, COMMIT, previous))
        self.assertEqual(manifest['previous_candidate'], previous)
        self.assertEqual(manifest['approval'], 'UNAPPROVED')

    def test_historical_snapshot_ignores_later_working_tree_changes(self):
        with tempfile.TemporaryDirectory() as folder:
            root, dist = Path(folder) / 'repo', Path(folder) / 'dist'
            scripts = root / 'Run/Scripts'
            scripts.mkdir(parents=True)
            def run(where, *args):
                return subprocess.check_output(['git', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                    '-c', 'commit.gpgsign=false', *args], cwd=where, stderr=subprocess.DEVNULL).decode().strip()
            for where in [scripts, root / 'Run', root]:
                run(where, 'init', '-q')
            (scripts / 'COPYING').write_bytes(self.support['/Scripts/COPYING'])
            (scripts / 'test.js').write_bytes(self.support['/Scripts/test.js'])
            run(scripts, 'add', '.'); run(scripts, 'commit', '-qm', 'synthetic scripts')
            scripts_revision = run(scripts, 'rev-parse', 'HEAD')
            run(root / 'Run', 'update-index', '--add', '--cacheinfo', f'160000,{scripts_revision},Scripts')
            run(root / 'Run', 'commit', '-qm', 'synthetic data gitlink')
            data_revision = run(root / 'Run', 'rev-parse', 'HEAD')
            files, info, source, _, _ = fixture(data_revision, scripts_revision)
            for name, value in source.items():
                name = name.removeprefix('openfodder/')
                if name.startswith('Run/'):
                    continue
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(value)
                run(root, 'add', name)
            run(root, 'update-index', '--add', '--cacheinfo', f'160000,{data_revision},Run')
            run(root, 'commit', '-qm', 'synthetic engine')
            revision = run(root, 'rev-parse', 'HEAD')
            info['commit'] = revision
            source, _, _, _ = source_at(revision, root=root)
            files['source.zip'] = deterministic_zip(source)
            files['build-info.json'] = json_bytes(info)
            files['SOURCE.txt'] = f'{revision} source.zip'.encode()
            for name, value in files.items():
                path = dist / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(value)
            (root / 'COPYING').write_bytes(b'later edit')
            verify_dist(dist, revision=revision, root=root)
            with self.assertRaisesRegex(ValueError, 'Commit source changes'):
                verify_dist(dist, root=root)


if __name__ == '__main__':
    unittest.main()
