@echo off
setlocal
cd /d "%~dp0"
echo Building combat-sim.zip ...
powershell -NoProfile -Command "$files = @('gcc\dungeon-encounter.html','gcc\footprints_sim.js','gcc\bridge_sim.js','gcc\Val.json') | Where-Object { Test-Path $_ }; Compress-Archive -Path $files -DestinationPath 'combat-sim.zip' -Force; Write-Host ('Zipped ' + $files.Count + ' files into combat-sim.zip'); $files | ForEach-Object { Write-Host ('  ' + $_) }"
echo Done.
pause
endlocal
