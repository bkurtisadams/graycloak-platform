@echo off
REM emulator.bat - start the Firestore emulator and leave it running.
REM Use this when you want to run tests repeatedly, or poke at the
REM emulator UI. Close the window or press Ctrl-C to stop it.
REM
REM   Emulator UI:  http://127.0.0.1:4000
REM
REM With this running, in another window:
REM   cd graycloak-adnd
REM   node --test test/traveller-rules.test.mjs
setlocal
cd /d "%~dp0graycloak-adnd"
echo Starting the Firestore emulator. Ctrl-C to stop.
echo.
call npx firebase emulators:start --only firestore
pause
