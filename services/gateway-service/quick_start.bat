@echo off
chcp 65001 > nul
echo ============================================
echo   Gateway Service 시작
echo   포트: 8080
echo   Admin UI: http://localhost:8080/admin/ui
echo ============================================
echo.

python main.py

pause
