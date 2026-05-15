@echo off
color 0A
cls
echo ===================================================
echo       FARM ASSIST 
echo ===================================================

echo [1/3] Closing old windows...
taskkill /F /IM node.exe >nul 2>&1

echo [2/3] Starting Servers...
:: Start Backend (Hidden)
start /B cmd /c "cd backend && node index.js"

:: Start Frontend (Hidden)
cd frontend
start /B cmd /c "npm run dev"

echo [3/3] Opening Browser...
timeout /t 5 >nul
start http://localhost:3005

echo.
echo ===================================================
echo   APP IS RUNNING IN BACKGROUND.
echo   IF BROWSER DOESN'T OPEN, GO TO:
echo   http://localhost:3005
echo ===================================================
pause
