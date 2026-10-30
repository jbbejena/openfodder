#!/usr/bin/env python3
"""Build/package an UNAPPROVED candidate, or independently verify/extract one."""
import argparse
import subprocess
from pathlib import Path
from web_artifact import ROOT, git, require, verify_dist
from web_candidate import TOOLS, digest, extract_new, make_candidate, verified_archive, verify_candidate


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--from-dist', type=Path, help='Reuse a committed dist, verified against --expect-commit')
    parser.add_argument('--expect-commit', help='Exact full source revision expected in the artifact')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'build-web/candidates')
    parser.add_argument('--previous-candidate', type=Path, help='Verified previous ZIP to identify for rollback; never embedded')
    parser.add_argument('--verify', type=Path, help='Verify ZIP, internal files and adjacent checksum without Git/SDK')
    parser.add_argument('--expect-sha256', help='Trusted ZIP digest instead of the adjacent .sha256 file')
    parser.add_argument('--extract', type=Path, help='Extract a verified ZIP into a NEW directory; never overwrite')
    args = parser.parse_args()
    try:
        if args.verify:
            require(not args.from_dist and not args.previous_candidate, '--verify cannot build or select a previous candidate')
            files, info, sha = verified_archive(args.verify, args.expect_sha256, args.expect_commit)
            if args.extract:
                extract_new(files, args.extract)
            print(f"Verified UNAPPROVED candidate {info['build']['commit']} SHA-256 {sha}")
            return
        require(not args.extract and not args.expect_sha256, '--extract/--expect-sha256 require --verify')
        require(not git('status', '--porcelain', '--untracked-files=all').strip(), 'Commit source changes before packaging a candidate')
        producer = git('rev-parse', 'HEAD').decode().strip()
        previous = None
        if args.previous_candidate:
            _, manifest, sha = verified_archive(args.previous_candidate)
            previous = {'filename': args.previous_candidate.name, 'sha256': sha,
                        'commit': manifest['build']['commit'], 'approval': manifest['approval']}
        if args.from_dist:
            require(args.expect_commit is not None, '--from-dist requires --expect-commit')
            dist, revision = args.from_dist, args.expect_commit
        else:
            require(args.expect_commit in (None, producer), '--expect-commit differs from current source')
            subprocess.run([str(ROOT / 'scripts/build-web.sh')], cwd=ROOT, check=True)
            dist, revision = ROOT / 'build-web/cmake/dist', producer
        files, info = verify_dist(dist, revision=revision)
        tools = {name: (ROOT / 'scripts' / Path(name).name).read_bytes() for name in TOOLS}
        data = make_candidate(files, info, tools, producer, previous)
        verify_candidate(data)
        sha = digest(data)
        args.output_dir.mkdir(parents=True, exist_ok=True)
        target = args.output_dir / f'openfodder-mobile-{revision}-{sha[:12]}-unapproved.zip'
        checksum = Path(str(target) + '.sha256')
        line = f'{sha}  {target.name}\n'
        require(not target.is_symlink() and not checksum.is_symlink(), 'Refusing output symlinks')
        require(not target.exists() or target.read_bytes() == data, 'Refusing to replace a different artifact')
        require(not checksum.exists() or checksum.read_text() == line, 'Refusing to replace a different checksum')
        if not target.exists():
            with target.open('xb') as output:
                output.write(data)
        if not checksum.exists():
            with checksum.open('x') as output:
                output.write(line)
        print(f'UNAPPROVED candidate: {target}\nSHA-256: {sha}\nChecksum: {checksum}')
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        parser.exit(1, f'Candidate rejected: {error}\n')


if __name__ == '__main__':
    main()
