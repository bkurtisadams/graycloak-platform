@echo off
REM ============================================================================
REM  zip-project.bat - package the graycloak-platform source into a lean zip
REM  for sharing. Place this at the project root and double-click it, or run it
REM  from any working directory. The script always uses its own folder as root.
REM
REM  Excludes recursively:
REM    dirs : node_modules  .git  dist  .firebase  maps
REM    files: *.zip *.log *.tmp *.bak  Thumbs.db .DS_Store
REM           *adminsdk*.json  *service-account*.json
REM           .env .env.* *.pem *.p12 *.pfx *.key
REM           gwmap.png  greyhawk-map.jpg
REM
REM  Keeps source/HTML/CSS/JS/MD, .github, dotfiles, configs, seed JSON, and
REM  small images/logos. The .NET ZIP API is used instead of Compress-Archive
REM  because Compress-Archive can omit hidden files and folders.
REM ============================================================================

setlocal EnableExtensions
pushd "%~dp0"

set "STAGE=%TEMP%\graycloak-pkg-%RANDOM%-%RANDOM%"
set "OUT=%~dp0graycloak-src.zip"

if exist "%STAGE%" rmdir /s /q "%STAGE%"
if exist "%OUT%" del /f /q "%OUT%"

mkdir "%STAGE%" >nul 2>&1
if errorlevel 1 (
  echo ERROR: could not create staging folder:
  echo   %STAGE%
  popd & endlocal & exit /b 1
)

echo Staging source files...
robocopy "%~dp0." "%STAGE%" /E /R:1 /W:1 ^
  /XD node_modules .git dist .firebase maps ^
  /XF *.zip *.log *.tmp *.bak *adminsdk*.json *service-account*.json ^
      .env .env.* *.pem *.p12 *.pfx *.key Thumbs.db .DS_Store ^
      gwmap.png greyhawk-map.jpg >nul

REM Robocopy exit codes 0-7 are success; 8+ indicate a failure.
if errorlevel 8 (
  echo ERROR: robocopy failed.
  if exist "%STAGE%" rmdir /s /q "%STAGE%"
  popd & endlocal & exit /b 1
)

REM Defense in depth: remove forbidden folders/files if a future Robocopy
REM change or unusual path layout allowed one through, then create and inspect
REM the archive using System.IO.Compression.
echo Compressing and validating...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; $root=$env:STAGE; $out=$env:OUT; $blockedDirs=@('node_modules','.git','dist','.firebase','maps'); Get-ChildItem -LiteralPath $root -Directory -Recurse -Force | Where-Object { $blockedDirs -contains $_.Name } | Sort-Object { $_.FullName.Length } -Descending | Remove-Item -Recurse -Force; Get-ChildItem -LiteralPath $root -File -Recurse -Force | Where-Object { $_.Name -match '(?i)(adminsdk|service-account).*\.json$' -or $_.Name -match '(?i)^\.env($|\.)' -or $_.Extension -match '(?i)^\.(pem|p12|pfx|key)$' -or $_.Name -match '(?i)^(gwmap\.png|greyhawk-map\.jpg)$' } | Remove-Item -Force; if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out -Force }; [System.IO.Compression.ZipFile]::CreateFromDirectory($root,$out,[System.IO.Compression.CompressionLevel]::Optimal,$false); $zip=[System.IO.Compression.ZipFile]::OpenRead($out); try { $bad=@($zip.Entries | Where-Object { $_.FullName -match '(?i)(^|/)(node_modules|\.git|dist|\.firebase|maps)(/|$)' -or $_.Name -match '(?i)(adminsdk|service-account).*\.json$' -or $_.Name -match '(?i)^\.env($|\.)' -or $_.Name -match '(?i)^(gwmap\.png|greyhawk-map\.jpg)$' }); if ($bad.Count) { throw ('Forbidden entries found in archive: ' + (($bad | Select-Object -First 8 -ExpandProperty FullName) -join ', ')) } } finally { $zip.Dispose() }"

if errorlevel 1 (
  echo ERROR: compression or archive validation failed.
  if exist "%OUT%" del /f /q "%OUT%"
  if exist "%STAGE%" rmdir /s /q "%STAGE%"
  popd & endlocal & exit /b 1
)

rmdir /s /q "%STAGE%"

if exist "%OUT%" (
  for %%F in ("%OUT%") do echo Done: %%~nxF  ^(%%~zF bytes^)
) else (
  echo ERROR: zip was not created.
  popd & endlocal & exit /b 1
)

popd
endlocal
