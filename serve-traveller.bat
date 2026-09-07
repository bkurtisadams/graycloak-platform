@echo off
REM serve-traveller.bat - serve the Traveller client for the browser.
REM Sign-in needs an http origin, so opening index.html from the file
REM system will not work. Close the window or press Ctrl-C to stop.
REM
REM   Then open:  http://localhost:8080/client/index.html
REM
REM Note: this holds port 8080. The Firestore emulator wants that port
REM too, so if you run both, change the emulator port in firebase.json.
setlocal
cd /d "%~dp0traveller"
echo Serving Traveller at http://localhost:8080/client/index.html
echo Ctrl-C to stop.
echo.
python -m http.server 8080
pause
