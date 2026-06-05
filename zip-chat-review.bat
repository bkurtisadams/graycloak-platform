@echo off
REM zip-chat-review.bat - bundle files needed to review campaign chat + sheet-roll integration
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
set "OUT=%ROOT%graycloak-chat-review.zip"
set "STAGE=%TEMP%\gc-chat-stage"

if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%\gcc"

set "FILES=faserip.html campaign-detail.html recap.html index.html firestore.rules gcc-auth.js gcc-sync.js gcc-firebase-config.js gcc-data.js gcc-storage.js gcc-header.js gcc-invite.js"

for %%F in (%FILES%) do (
  if exist "%ROOT%gcc\%%F" (
    copy /y "%ROOT%gcc\%%F" "%STAGE%\gcc\%%F" >nul
    echo  added    gcc\%%F
  ) else (
    echo  MISSING  gcc\%%F
  )
)

if exist "%OUT%" del /q "%OUT%"
powershell -NoProfile -Command "Compress-Archive -Path '%STAGE%\gcc' -DestinationPath '%OUT%' -Force"

rmdir /s /q "%STAGE%"
echo.
echo Created %OUT%
endlocal
