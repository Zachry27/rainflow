@echo off
title RainFlow Backend
cd /d "%~dp0"

if not exist ".venv" (
    echo [*] Membuat virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate

echo [*] Menginstal dependensi...
pip install -r requirements.txt -q

echo.
echo ============================================
echo  🌊 RainFlow Backend
echo  URL: http://localhost:9564
echo  API Docs: http://localhost:9564/docs
echo ============================================
echo.

python main.py
pause
