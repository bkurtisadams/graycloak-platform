@echo off
setlocal
cd /d "%~dp0"
echo Building combat-sim.zip ...
powershell -NoProfile -Command "$sim = Get-ChildItem 'gcc\dungeon-encounter-v*.html' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1; if (-not $sim) { $sim = Get-Item 'gcc\dungeon-encounter.html' }; $files = @($sim.FullName,'gcc\combat-data.js','gcc\DESIGN-ammog-harvest.md','gcc\RULES-1e-combat.md') | Where-Object { Test-Path $_ }; Compress-Archive -Path $files -DestinationPath 'combat-sim.zip' -Force; Write-Host ('Zipped ' + $files.Count + ' files:'); $files | ForEach-Object { Write-Host ('  ' + (Split-Path $_ -Leaf)) }"
echo Done.
pause
endlocal