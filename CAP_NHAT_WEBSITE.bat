@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\@fontsource-variable\inter" (
  call npm ci
  if errorlevel 1 goto failed
)
call npm run build
if errorlevel 1 goto failed
node scripts\launch.mjs --open
if errorlevel 1 goto failed
echo Updated. Refresh your browser to see changes.
pause
exit /b 0
:failed
echo Update failed. Please keep this message and ask for support.
pause
exit /b 1
