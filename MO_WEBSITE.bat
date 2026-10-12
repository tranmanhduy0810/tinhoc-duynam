@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22 or newer from https://nodejs.org and try again.
  pause
  exit /b 1
)
if not exist "dist\index.html" (
  echo Preparing website for first run...
  call npm ci
  if errorlevel 1 goto failed
  call npm run build
  if errorlevel 1 goto failed
)
node scripts\launch.mjs --open
if errorlevel 1 goto failed
exit /b 0
:failed
echo Setup failed. Please keep this message and ask for support.
pause
exit /b 1
