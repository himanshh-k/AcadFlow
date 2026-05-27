@echo off
cd /d "%~dp0"
echo Starting Backend Server...
venv\Scripts\python.exe -m uvicorn Backend.main:app --reload
pause
