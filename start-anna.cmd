@echo off
SET PATH=%USERPROFILE%\.local\bin;%APPDATA%\npm;%PATH%

echo [1/2] Starting Anna Agent file server on port 8787...
start "Anna Agent" cmd /k "cd /d %~dp0 && node Agent/server.js"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Anna App harness...
echo       Visit http://localhost:5180/ once ready.
echo       Type /vibe coffee shop called Morning Brew to generate a site.
echo.
anna-app dev
