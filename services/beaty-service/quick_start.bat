@echo off
echo ========================================
echo Beaty Agent Service - Tool Use AI
echo Port: 8000
echo ========================================
echo.

cd /d "%~dp0"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
