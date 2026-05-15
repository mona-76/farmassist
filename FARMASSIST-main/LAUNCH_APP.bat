@echo off
cls
echo ========================================================
echo   FARM ASSIST  
echo   Government of Jharkhand Agriculture Portal
echo ========================================================
echo.

echo [Step 1/5] Cleaning up previous instances...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul
echo ✓ Cleanup complete

echo.
echo [Step 2/5] Installing backend dependencies...
cd backend
call npm install >nul 2>&1
echo ✓ Backend ready

echo.
echo [Step 3/5] Installing frontend dependencies...
cd ..\frontend
call npm install >nul 2>&1
echo ✓ Frontend ready

echo.
echo [Step 4/5] Starting servers...
cd ..\backend
start "FarmAssist Backend (Port 5000)" cmd /k "node index.js"
timeout /t 3 >nul

cd ..\frontend
start "FarmAssist Frontend (Port 3005)" cmd /k "npm run dev"
timeout /t 8 >nul

echo ✓ Servers started

echo.
echo [Step 5/5] Opening application...
start http://localhost:3005
echo ✓ Application launched

echo.
echo ========================================================
echo   SUCCESS! Your application is now running.
echo.
echo   Frontend: http://localhost:3005
echo   Backend:  http://localhost:5000
echo.
echo   Please keep both terminal windows open.
echo   Press any key to close this window...
echo ========================================================
pause >nul
