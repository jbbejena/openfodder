import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import windows_scope as scope


class ScopeTests(unittest.TestCase):
    def compare(self, before, after):
        """Exercise real git diffs, including additions, deletions and renames."""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            def git(*args):
                return subprocess.check_output(['git', *args], cwd=root, stderr=subprocess.DEVNULL)
            git('init', '-q')
            git('config', 'user.name', 'CI scope test')
            git('config', 'user.email', 'ci-scope@example.invalid')
            for files in [before, after]:
                for p in root.rglob('*'):
                    if p.is_file() and '.git' not in p.relative_to(root).parts:
                        p.unlink()
                for name, content in files.items():
                    p = root / name
                    p.parent.mkdir(parents=True, exist_ok=True)
                    p.write_text(content)
                git('add', '.')
                git('commit', '-qm', 'fixture', '--allow-empty')
            with patch.object(scope, 'git', git):
                return scope.needs_windows('HEAD^', 'HEAD')[0]

    def test_docs_and_browser_changes_skip_windows(self):
        self.assertFalse(self.compare({}, {
            'docs/mobile/BUILD.md': 'new evidence', 'AGENT_HANDOFF.md': 'handoff',
            'web/bootstrap.js': 'launcher', 'scripts/build-web.sh': 'sdk',
            'Source/Start_Emscripten.cpp': 'browser only',
            'Projects/emscripten/build_emscripten.cmd': 'helper',
        }))

    def test_shared_cpp_and_native_dependencies_keep_windows(self):
        for path in ['Source/Fodder.cpp', 'Source/GameData.hpp', 'Source/Start.cpp',
                     'Projects/build_vs.cmd', 'vcpkg.json', '.gitmodules', 'Run']:
            with self.subTest(path=path):
                self.assertTrue(self.compare({path: 'old'}, {path: 'new'}))

    def test_web_cmake_nested_condition_and_quotes_skip_windows(self):
        before = 'if(EMSCRIPTEN)\nset(X "old")\nelse()\nset(NATIVE ON)\nendif()\n'
        after = 'if(EMSCRIPTEN)\nif(NOT EXISTS "file")\nmessage("if(foo) # )")\nendif()\nelse()\nset(NATIVE ON)\nendif()\n'
        self.assertFalse(self.compare({'CMakeLists.txt': before}, {'CMakeLists.txt': after}))

    def test_native_cmake_and_changed_guard_keep_windows(self):
        before = 'if(EMSCRIPTEN)\nset(WEB ON)\nelse()\nset(NATIVE ON)\nendif()\n'
        for after in [before.replace('NATIVE ON', 'NATIVE OFF'),
                      before.replace('if(EMSCRIPTEN)', 'if(EMSCRIPTEN OR WIN32)'),
                      before + 'target_link_libraries(openfodder PRIVATE newlib)\n']:
            with self.subTest(after=after):
                self.assertTrue(self.compare({'CMakeLists.txt': before}, {'CMakeLists.txt': after}))

    def test_new_deleted_or_ambiguous_cmake_keeps_windows(self):
        for before, after in [({}, {'CMakeLists.txt': 'project(x)'}),
                              ({'cmake/FindFFmpeg.cmake': 'set(X ON)'}, {}),
                              ({'CMakeLists.txt': 'set(X ON)'}, {'CMakeLists.txt': 'if(EMSCRIPTEN)'}),
                              ({'CMakeLists.txt': 'set(X ON)'}, {'CMakeLists.txt': '#[[if(EMSCRIPTEN)]]\nset(X OFF)'}),
                              ({'CMakeLists.txt': 'set(X ON)'}, {'CMakeLists.txt': 'function(foo)\nendfunction()'}),
                              ({'CMakeLists.txt': 'set(EMSCRIPTEN ON)\nif(EMSCRIPTEN)\nset(X ON)\nendif()'},
                               {'CMakeLists.txt': 'set(EMSCRIPTEN ON)\nif(EMSCRIPTEN)\nset(X OFF)\nendif()'})]:
            with self.subTest(before=before, after=after):
                self.assertTrue(self.compare(before, after))

    def test_rename_out_of_native_source_still_keeps_windows(self):
        self.assertTrue(self.compare({'Source/Engine.cpp': 'code'}, {'web/Engine.cpp': 'code'}))

    def test_ci_routing_skips_but_windows_step_changes_keep_windows(self):
        before = 'on: [push, pull_request]\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - run: cmake --build build\n'
        after = 'on: [pull_request]\njobs:\n  scope:\n    runs-on: ubuntu-latest\n  build:\n    needs: scope\n    if: needs.scope.outputs.native == true\n    runs-on: windows-latest\n    steps:\n      - run: cmake --build build\n'
        self.assertFalse(self.compare({scope.WORKFLOW: before}, {scope.WORKFLOW: after}))
        self.assertTrue(self.compare({scope.WORKFLOW: before}, {scope.WORKFLOW: after.replace('cmake --build build', 'cmake --build other')}))


if __name__ == '__main__':
    unittest.main()
