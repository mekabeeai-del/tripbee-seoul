@echo off
echo Stopping MEKABEE SEOUL TRIP - Find Place...
echo.

REM Kill all Python processes running on port 8003
echo Stopping FastAPI server on port 8003...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8003') do (
    echo Killing process %%a
    taskkill /f /pid %%a >nul 2>&1
)

REM Alternative method to kill uvicorn processes
taskkill /f /im python.exe /fi "WINDOWTITLE eq MEKABEE*" >nul 2>&1

echo.
echo Server stopped successfully.
pause