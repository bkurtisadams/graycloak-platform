@echo off
rem deploy.bat - build the OD&D functions and deploy them.
rem Run from anywhere:  C:\graycloak-platform\odd\functions\deploy.bat
rem Extra arguments go to firebase, e.g.  deploy.bat --debug
node "%~dp0scripts\build.mjs" || exit /b 1
pushd "%~dp0..\..\graycloak-adnd" || exit /b 1
call firebase deploy --only functions:odd %*
set RESULT=%ERRORLEVEL%
popd
exit /b %RESULT%
