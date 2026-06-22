@echo off
REM StrideShop Demo — starts both servers
REM Uses --mock-llm so it works WITHOUT verified Anna developer access.
REM When you get developer access, replace --mock-llm with nothing (live LLM).

SET PATH=%USERPROFILE%\.local\bin;%APPDATA%\npm;%PATH%

echo [1/2] Starting Anna Agent file server on port 8787...
start "Anna Agent" cmd /k "cd /d %~dp0 && node Agent/server.js"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Anna App harness (mock LLM)...
echo       Visit http://localhost:5180/ once ready.
echo       Type /vibe build a shoe store website to generate the site.
echo.
anna-app dev --mock-llm fixtures/vibe.jsonl
