#!/usr/bin/env python3
"""Decide whether a PR/push changes Windows compiler inputs; default to building."""
import argparse
import json
import os
import re
import subprocess
from pathlib import Path

import yaml

WORKFLOW = '.github/workflows/windows-build.yml'


def git(*args):
    return subprocess.check_output(['git', *args], stderr=subprocess.DEVNULL)


def cmake_native_commands(text):
    """Ignore only bodies guarded by exactly EMSCRIPTEN, retaining native branches.

    Read balanced commands, including quoted arguments and comments, rather than
    guessing from diff hunk positions. Bracket syntax/ambiguous input falls back
    to a Windows build. This is intentionally not a general CMake evaluator.
    """
    if re.search(r'\[=*\[', text):
        raise ValueError('CMake bracket syntax requires native validation')
    commands, stack = [], []
    pos = 0
    while pos < len(text):
        if text[pos].isspace():
            pos += 1
            continue
        if text[pos] == '#':
            end = text.find('\n', pos)
            pos = len(text) if end < 0 else end + 1
            continue
        match = re.match(r'([A-Za-z_][A-Za-z_0-9]*)\s*\(', text[pos:])
        if not match:
            raise ValueError('Unrecognized CMake statement')
        name = match[1].lower()
        start = pos + match.end()
        pos, depth, quoted = start, 1, False
        while pos < len(text) and depth:
            char = text[pos]
            if char == '\\':
                pos += 2
                continue
            if char == '"':
                quoted = not quoted
            elif not quoted:
                if char == '#':
                    end = text.find('\n', pos)
                    pos = len(text) if end < 0 else end + 1
                    continue
                if char == '(':
                    depth += 1
                elif char == ')':
                    depth -= 1
            pos += 1
        if depth or quoted:
            raise ValueError('Unbalanced CMake statement')
        arguments = text[start:pos - 1]
        if name in ('function', 'macro', 'cmake_language'):
            raise ValueError('Dynamic CMake scope requires native validation')
        if (not any(stack) and name in ('set', 'unset', 'option')
                and re.match(r'\s*EMSCRIPTEN(?:\s|$)', arguments)):
            raise ValueError('Overridden EMSCRIPTEN condition requires native validation')
        if name in ('else', 'elseif', 'endif'):
            if not stack:
                raise ValueError('Unbalanced CMake conditional')
            stack.pop()
        # An outer EMSCRIPTEN branch suppresses all nested statements, including
        # their conditionals. Keep the outer condition/else/endif themselves.
        if not any(stack):
            commands.append((name, arguments))
        if name in ('if', 'elseif', 'else'):
            stack.append(name != 'else' and arguments.strip() == 'EMSCRIPTEN')
    if stack:
        raise ValueError('Unclosed CMake conditional')
    return commands


def windows_job(text):
    """Trigger/gate edits need validation; compiler-job edits need Windows too."""
    job = yaml.safe_load(text)['jobs']['build'].copy()
    job.pop('needs', None)
    job.pop('if', None)
    return job


def relevant_path(path):
    return (
        (path.startswith('Source/') and path != 'Source/Start_Emscripten.cpp')
        or path == 'CMakeLists.txt' or path.startswith('cmake/')
        or (path.startswith('Projects/') and not path.startswith('Projects/emscripten/'))
        or (path.startswith('vcpkg') and path.endswith('.json'))
        or path in ('.gitmodules', 'Run', WORKFLOW)
    )


def needs_windows(base, head):
    paths = git('diff', '--name-only', '-z', '--no-renames', base, head).decode().split('\0')
    for path in filter(relevant_path, paths):
        try:
            if path == 'CMakeLists.txt' or path.endswith('.cmake') or path == WORKFLOW:
                before = git('show', f'{base}:{path}').decode()
                after = git('show', f'{head}:{path}').decode()
                normalize = windows_job if path == WORKFLOW else cmake_native_commands
                if normalize(before) == normalize(after):
                    continue
        except (ValueError, KeyError, TypeError, yaml.YAMLError, subprocess.CalledProcessError):
            # New/deleted/unrecognized config must never silently lose coverage.
            pass
        return True, f'Windows input changed: {path}'
    return False, 'Only web, documentation, or CI routing changed; no Windows compiler inputs changed.'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', help='Override event refs for local verification')
    parser.add_argument('--head', default='HEAD')
    args = parser.parse_args()
    if args.base:
        base, head = args.base, args.head
    else:
        event = json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text())
        if 'pull_request' in event:
            head = event['pull_request']['head']['sha']
            base = git('merge-base', event['pull_request']['base']['sha'], head).decode().strip()
        else:
            base, head = event.get('before'), event.get('after')
    if not base or not head or set(base) == {'0'}:
        native, reason = True, 'Manual dispatch or missing comparison base: run Windows validation.'
    else:
        native, reason = needs_windows(base, head)
    print(json.dumps({'native': native, 'reason': reason}))
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
            output.write(f'native={str(native).lower()}\n')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write(f'Windows matrix: **{"required" if native else "skipped"}**. {reason}\n')


if __name__ == '__main__':
    main()
