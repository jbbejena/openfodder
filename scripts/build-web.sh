#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
build="$root/build-web"
tools="$build/tools"
sdk="$tools/emsdk"
sdk_commit=c0bb220cb6e6f4e0fabb6f6db9efd53390ef5e56
mkdir -p "$tools"
if [[ ! -d "$sdk/.git" ]]; then
    git clone https://github.com/emscripten-core/emsdk.git "$sdk"
    git -C "$sdk" checkout --detach "$sdk_commit"
fi
[[ $(git -C "$sdk" rev-parse HEAD) == "$sdk_commit" ]] || {
    echo 'Unexpected emsdk checkout; use the recorded pin (see docs/mobile/BUILD.md).' >&2; exit 1;
}
"$sdk/emsdk" install 4.0.23
"$sdk/emsdk" activate 4.0.23
source "$sdk/emsdk_env.sh"
if [[ ! -x "$tools/venv/bin/cmake" ]]; then
    python3 -m venv "$tools/venv"
    "$tools/venv/bin/python" -m pip install cmake==3.31.6 ninja==1.11.1.4
fi
export PATH="$tools/venv/bin:$PATH"
export EM_CACHE="$build/cache"
[[ $(emcc -dumpversion) == 4.0.23 ]]
[[ $(cmake --version | head -1) == 'cmake version 3.31.6' ]]
[[ $(ninja --version) == 1.11.1* ]]
python3 "$root/scripts/prepare-web.py"
emcmake cmake -S "$root" -B "$build/cmake" -G Ninja \
    -DCMAKE_BUILD_TYPE=Release -DOPENFODDER_AUTO_FFMPEG=OFF \
    -DOPENFODDER_WEB_CONTENT="$build/runtime"
cmake --build "$build/cmake" --parallel "${WEB_JOBS:-4}"
python3 "$root/scripts/prepare-web.py" --package
echo "Browser artifact: $build/cmake/dist (serve with python3 -m http.server -d that-directory)"
