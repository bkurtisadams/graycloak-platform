@echo off
rem deploy.bat - v0.330.1: build the Traveller function and deploy it.
rem Run from anywhere:  C:\graycloak-platform\traveller\functions\deploy.bat
rem Extra arguments go to firebase, e.g.  deploy.bat --debug
node "%~dp0scripts\build.mjs" || exit /b 1
pushd "%~dp0..\..\graycloak-adnd" || exit /b 1
call firebase deploy --only functions:traveller %*
set RESULT=%ERRORLEVEL%
popd
exit /b %RESULT%
