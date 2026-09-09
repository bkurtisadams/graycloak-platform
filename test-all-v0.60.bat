@echo off
REM test-all.bat - every suite in the platform, in the order that makes sense.
REM Drop this in C:\graycloak-platform and double-click, or run from a prompt.
setlocal
set ROOT=%~dp0
set FAILED=0

echo ============================================================
echo  1/4  Classic Traveller rules
echo ============================================================
pushd "%ROOT%packages\classic-traveller-rules"
call npm test
if errorlevel 1 set FAILED=1
popd

echo.
echo ============================================================
echo  2/4  Traveller
echo ============================================================
pushd "%ROOT%traveller"
call npm test
if errorlevel 1 set FAILED=1
popd

echo.
echo ============================================================
echo  3/4  FASERIP rules
echo ============================================================
pushd "%ROOT%faserip-rules"
call npm test
if errorlevel 1 set FAILED=1
popd

echo.
echo ============================================================
echo  4/4  AD^&D  (the Firestore rules suite is separate because
echo       it needs the emulator - use test-rules.bat for that one)
echo ============================================================
pushd "%ROOT%graycloak-adnd"
call npm test
if errorlevel 1 set FAILED=1
popd

echo.
if "%FAILED%"=="1" (
  echo ************************************************************
  echo  SOMETHING FAILED - scroll up for the first red line.
  echo ************************************************************
) else (
  echo ============================================================
  echo  All suites passed.
  echo ============================================================
)
pause
