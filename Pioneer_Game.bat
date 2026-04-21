@echo off
chcp 65001 > nul
cls
echo.
echo ========================================
echo   Pioneer Tycoon - Game Launcher
echo ========================================
echo.
echo Starting game server...
echo.
cd /d "%~dp0"
if exist "node_modules\.bin\http-server" (
  npx http-server dist -p 8000 -o
) else (
  echo http-server npm package is not installed.
  echo Run: npm install http-server --save-dev
  exit /b 1
)
