@echo off
echo ============================================
echo LC-Beaty Service Starting (Port 8000)
echo ============================================
echo.

cd /d "%~dp0"

REM Python 가상환경 활성화 (있다면)
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM 서비스 실행
python main.py

pause
