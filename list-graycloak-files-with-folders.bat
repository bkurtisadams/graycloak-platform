@echo off
setlocal
cd /d "%~dp0"
echo Listing folders and files under "%cd%"
echo (excluding node_modules and .git)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Get-Location).Path; $filter={ $_.FullName -notmatch '\\(node_modules|\.git)(\\|$)' }; $folders=@(Get-ChildItem -Recurse -Directory | Where-Object $filter | Sort-Object FullName); $files=@(Get-ChildItem -Recurse -File | Where-Object $filter | Sort-Object FullName); 'Graycloak Platform Folder Listing'; 'Root: '+$root; 'Generated: '+(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'); ''; 'Folders: '+$folders.Count; 'Files: '+$files.Count; ''; '=== FOLDERS ==='; $folders | ForEach-Object { '[DIR]       ' + $_.FullName.Substring($root.Length+1) }; ''; '=== FILES ==='; $files | ForEach-Object { '{0,9:N1} KB  {1}' -f ($_.Length/1KB), $_.FullName.Substring($root.Length+1) }" > graycloak-files.txt
echo Done. Wrote graycloak-files.txt
notepad graycloak-files.txt
endlocal
