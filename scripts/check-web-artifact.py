#!/usr/bin/env python3
"""Fail publication if assets or missing/mismatched source enter the artifact."""
import argparse
from pathlib import Path
from web_artifact import ROOT, verify_dist


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--allow-dirty', action='store_true', help='Local verification only')
    parser.add_argument('--dist', type=Path, default=ROOT / 'build-web/cmake/dist')
    parser.add_argument('--ref', help='Full recorded source commit for a historical artifact')
    args = parser.parse_args()
    try:
        files, info = verify_dist(args.dist, revision=args.ref, allow_dirty=args.allow_dirty)
    except (ValueError, KeyError) as error:
        parser.exit(1, f'Artifact rejected: {error}\n')
    print(f"Artifact/source verified for {info['commit']}; no game assets ({len(files)} distributed files).")


if __name__ == '__main__':
    main()
