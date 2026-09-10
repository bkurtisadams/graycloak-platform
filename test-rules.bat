@echo off
REM test-rules.bat - Firestore security rules against the emulator.
REM Starts the emulator, runs the suite, shuts the emulator down again.
REM Nothing touches live Firestore.
setlocal
cd /d "%~dp0graycloak-adnd"

echo Checking the two rules files match...
node -e "const fs=require('fs');const a=fs.readFileSync('firestore.rules','utf8');const b=fs.readFileSync('../gcc/firestore.rules','utf8');if(a!==b){console.error('');console.error('  MISMATCH: graycloak-adnd\\firestore.rules and gcc\\firestore.rules differ.');console.error('  Copy one over the other before testing:');console.error('');console.error('    copy graycloak-adnd\\firestore.rules gcc\\firestore.rules');console.error('');process.exit(1);}console.log('  ok - both copies are identical.')"
if errorlevel 1 (
  pause
  exit /b 1
)

echo.
echo Starting the Firestore emulator and running the rules suite...
echo.
call npx firebase emulators:exec --only firestore "node --test test/traveller-rules.test.mjs"
set RESULT=%errorlevel%

echo.
if "%RESULT%"=="0" (
  echo ============================================================
  echo  Rules suite passed.
  echo  Check above for "evaluation error at L264" - there should
  echo  be none. Errors at other line numbers are the existing
  echo  AD^&D rules and are expected.
  echo ============================================================
) else (
  echo ************************************************************
  echo  Rules suite FAILED - do not deploy.
  echo ************************************************************
)
pause
