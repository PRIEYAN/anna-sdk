@echo off
SET PATH=%APPDATA%\npm;%USERPROFILE%\.local\bin;%PATH%

echo.
echo  Anna Vibe Coder
echo  ==============================================================

REM Check if user is logged in to Anna
FOR /F "tokens=*" %%i IN ('anna-app whoami 2^>^&1') DO SET ANNA_WHO=%%i
echo %ANNA_WHO% | findstr /i "no accounts" >nul
IF %ERRORLEVEL% EQU 0 (
  echo.
  echo  [!] NOT LOGGED IN — Anna AI LLM will NOT work.
  echo.
  echo  To generate real websites with Anna AI:
  echo.
  echo    1. Run this command to log in:
  echo       anna-app login --host https://anna.partners
  echo.
  echo    2. Complete the device flow in your browser.
  echo.
  echo    3. If you see "verified developer required" on the website,
  echo       apply at: https://anna.partners/developers
  echo       Then come back and run this script again.
  echo.
  echo  Starting in OFFLINE mode ^(no LLM^)...
  echo  The app will show a clear error when you try /vibe.
  echo  ==============================================================
  echo.

  start "Anna Agent" cmd /k "cd /d %~dp0 && node Agent/server.js"
  timeout /t 2 /nobreak >nul
  anna-app dev --no-llm
  goto :eof
)

echo  Logged in as: %ANNA_WHO%
echo  ==============================================================
echo.
echo  Starting Agent server on port 8787...
start "Anna Agent" cmd /k "cd /d %~dp0 && node Agent/server.js"
timeout /t 2 /nobreak >nul

echo  Starting Anna App harness (real LLM)...
echo  Visit http://localhost:5180/ once ready.
echo  Type: /vibe a coffee shop called Morning Brew
echo.
anna-app dev
