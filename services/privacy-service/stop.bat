@echo off
echo Stopping MEKABEE SEOUL TRIP - Privacy Service...
echo.

REM Kill all Python processes running on port 8100
echo Stopping FastAPI server on port 8100...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8100') do (
    echo Killing process %%a
    taskkill /f /pid %%a >nul 2>&1
)

REM Alternative method to kill uvicorn processes
taskkill /f /im python.exe /fi "WINDOWTITLE eq MEKABEE*" >nul 2>&1

echo.
echo Server stopped successfully.
pause