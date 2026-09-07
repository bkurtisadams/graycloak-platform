@echo off
REM test-all.bat - every suite in the platform, in the order that makes sense.
REM Drop this in C:\graycloak-platform and double-click, or run from a prompt.
setlocal
set ROOT=%~dp0
set FAILED=0

echo ============================================================
echo  1/3  Traveller
echo ============================================================
pushd "%ROOT%traveller"
call npm test
if errorlevel 1 set FAILED=1
popd

echo.
echo ============================================================
echo  2/3  FASERIP rules
echo ============================================================
pushd "%ROOT%faserip-rules"
call npm test
if errorlevel 1 set FAILED=1
popd

echo.
echo ============================================================
echo  3/3  AD^&D  (the Traveller rules suite skips without the
echo       emulator - use test-rules.bat for that one)
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
