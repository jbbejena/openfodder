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

    def test_web_only_cpp_branches_and_new_guarded_files_skip_windows(self):
        before = '#include "engine.hpp"\nvoid tick() {\n camera();\n inputs();\n}\n'
        after = ('#include "engine.hpp"\n#ifdef EMSCRIPTEN\n#include "WebInput.hpp"\n#endif\n'
                 'void tick() {\n#ifdef EMSCRIPTEN\n WebInput::Tick();\n#else\n camera();\n inputs();\n#endif\n}\n')
        self.assertFalse(self.compare({'Source/Fodder.cpp': before}, {
            'Source/Fodder.cpp': after,
            'Source/WebInput.cpp': '#ifdef EMSCRIPTEN\nint web = 1;\n#endif\n',
            'Source/WebInput.hpp': '#pragma once\n#ifdef EMSCRIPTEN\nvoid web();\n#endif\n',
        }))
        self.assertTrue(self.compare({'Source/Fodder.cpp': before}, {'Source/Fodder.cpp': after.replace('inputs();', 'different_inputs();')}))
        self.assertTrue(self.compare({}, {'Source/WebInput.hpp': '#pragma once\nint native;\n'}))

    def test_cpp_other_platforms_nested_guards_and_native_alternatives_remain(self):
        before = ('#ifdef WIN32\nint windows = 1;\n#ifdef EMSCRIPTEN\nint web = 1;\n#endif\n#endif\n'
                  '#ifndef __EMSCRIPTEN__\nint native = 1;\n#else\nint browser = 1;\n#endif\n')
        after = before.replace('web = 1', 'web = 2').replace('browser = 1', 'browser = 2')
        self.assertFalse(self.compare({'Source/GameData.hpp': before}, {'Source/GameData.hpp': after}))
        for changed in [after.replace('windows = 1', 'windows = 2'), after.replace('native = 1', 'native = 2'),
                        after.replace('#ifndef __EMSCRIPTEN__', '#ifdef __EMSCRIPTEN__')]:
            self.assertTrue(self.compare({'Source/GameData.hpp': before}, {'Source/GameData.hpp': changed}))
        self.assertFalse(self.compare({'Source/A.cpp': '#if defined(EMSCRIPTEN)\nint web = 1;\n#endif'},
                                      {'Source/A.cpp': '#if defined(EMSCRIPTEN)\nint web = 2;\n#endif'}))

    def test_cpp_mixed_guards_and_native_macro_or_literal_changes_keep_windows(self):
        for before, after in [
            ('#if defined(WIN32) || defined(EMSCRIPTEN)\nint shared = 1;\n#endif',
             '#if defined(WIN32) || defined(EMSCRIPTEN)\nint shared = 2;\n#endif'),
            ('#ifdef EMSCRIPTEN\nint web;\n#endif', '#ifdef WIN32\nint web;\n#endif'),
            ('#define CALL(x) x\n', '#define CALL (x) x\n'),
            ('int x = a+ +b;\n', 'int x = a++b;\n'),
            ('const char* x = "a b";\n', 'const char* x = "ab";\n'),
            ('#define definedEMSCRIPTEN 1\n#if definedEMSCRIPTEN\nint native = 1;\n#endif',
             '#define definedEMSCRIPTEN 1\n#if definedEMSCRIPTEN\nint native = 2;\n#endif'),
        ]:
            self.assertTrue(self.compare({'Source/A.cpp': before}, {'Source/A.cpp': after}))

    def test_cpp_comments_and_quoted_preprocessor_text_are_not_guards(self):
        before = ('/* #ifdef EMSCRIPTEN */\nconst char* x = "#ifdef EMSCRIPTEN";\n'
                  '// #endif\nint native = 1;\n')
        after = before + '#ifdef EMSCRIPTEN\nint browser;\n#endif\n'
        self.assertFalse(self.compare({'Source/A.cpp': before}, {'Source/A.cpp': after}))
        self.assertTrue(self.compare({'Source/A.cpp': before}, {'Source/A.cpp': after.replace('native = 1', 'native = 2')}))

    def test_cpp_unsupported_or_malformed_preprocessing_keeps_windows(self):
        cases = [
            '#ifdef EMSCRIPTEN\nint web;\n',
            '#ifdef EMSCRIPTEN\nint web;\n#elif WIN32\nint native;\n#endif',
            '#define EMSCRIPTEN 1\n#ifdef EMSCRIPTEN\nint web;\n#endif',
            '#ifdef EMSCRIPTEN\nint web;\n#endif extra',
            '#define X \\\n 1\n',
            'auto x = R"(raw)";\n',
            '// comment ??/\n#ifdef EMSCRIPTEN\nint native;\n#endif',
            '%:ifdef EMSCRIPTEN\nint native;\n%:endif',
            '/* unterminated',
        ]
        for after in cases:
            self.assertTrue(self.compare({'Source/A.cpp': ''}, {'Source/A.cpp': after}))


if __name__ == '__main__':
    unittest.main()
