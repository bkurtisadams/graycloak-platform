@echo off
REM serve-traveller.bat - CORRECTED.
REM
REM Serve from the PLATFORM ROOT, not from traveller\. The client imports the
REM rules package as ../../packages/classic-traveller-rules/index.js, which is
REM above traveller\ - so a server rooted there cannot reach it and the import
REM 404s, which stops app.js executing at all.
REM
REM   Then open:  http://localhost:8080/traveller/client/index.html
REM
REM Note: this holds port 8080, which the Firestore emulator also wants. If you
REM run both, change the emulator port in graycloak-adnd\firebase.json.
setlocal
cd /d "%~dp0"
echo Vendoring the rules package into traveller\vendor...
node traveller\scripts\sync-vendor.mjs
echo.
echo Serving from %CD%
echo.
echo    Open:  http://localhost:8080/traveller/client/enter.html
echo.
echo Ctrl-C to stop.
echo.
python -m http.server 8080
pause
