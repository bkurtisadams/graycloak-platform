@echo off
REM ============================================================================
REM  zip-project.bat - package the graycloak-platform source into a lean zip
REM  for sharing. Place this at the project root and double-click (or run from
REM  any cwd - it operates on the folder the .bat lives in).
REM
REM  Excludes:
REM    dirs : node_modules  .git  dist (build output)  .firebase (hosting cache)
REM    files: *.zip *.log *.tmp  Thumbs.db .DS_Store
REM           *adminsdk*.json  *service-account*.json   <- Firebase keys (secrets)
REM           gwmap.png  greyhawk-map.jpg               <- large map rasters (~14MB)
REM
REM  Keeps: all source/HTML/CSS/JS/MD, .github, .gitignore, configs, seed JSON,
REM         small images/logos.
REM
REM  To include the big map images or the built dist, remove them from the
REM  /XF / /XD lists below.
REM ============================================================================

setlocal
pushd "%~dp0"

set "STAGE=%TEMP%\graycloak-pkg"
set "OUT=%~dp0graycloak-src.zip"

if exist "%STAGE%" rmdir /s /q "%STAGE%"
if exist "%OUT%"   del /f /q "%OUT%"

echo Staging files (excluding node_modules, .git, dist, secrets, large images)...
robocopy "%~dp0." "%STAGE%" /E /XD node_modules .git dist .firebase /XF *.zip *.log *.tmp *adminsdk*.json *service-account*.json Thumbs.db .DS_Store gwmap.png greyhawk-map.jpg >nul
if errorlevel 8 (
  echo ERROR: robocopy failed.
  if exist "%STAGE%" rmdir /s /q "%STAGE%"
  popd & endlocal & exit /b 1
)

echo Compressing...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '%STAGE%\*' -DestinationPath '%OUT%' -Force"

rmdir /s /q "%STAGE%"

if exist "%OUT%" (
  for %%F in ("%OUT%") do echo Done: %%~nxF  ^(%%~zF bytes^)
) else (
  echo ERROR: zip was not created.
  popd & endlocal & exit /b 1
)

popd
endlocal
