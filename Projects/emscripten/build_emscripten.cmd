@echo off
setlocal
rem The supported web toolchain runs on Linux/WSL; see docs/mobile/BUILD.md.
for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"
wsl.exe --cd "%ROOT%" bash ./scripts/build-web.sh
exit /b %ERRORLEVEL%
