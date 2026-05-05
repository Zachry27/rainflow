@echo off
title RainFlow + BenAlus Server
color 0A
setlocal EnableDelayedExpansion

echo.
echo  =====================================================
echo   RainFlow + BenAlus STARTER
echo  =====================================================
echo.

set INSTALL_DIR=%USERPROFILE%\rainflow

if not exist "%INSTALL_DIR%" (
    echo  [ERROR] Folder tidak ditemukan: %INSTALL_DIR%
    echo  Jalankan install-windows.bat terlebih dahulu!
    pause
    exit /b 1
)

:: Tampilkan IP Server
echo  [INFO] IP Address server ini:
for /f "tokens=*" %%I in ('powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress | Select-Object -First 1"') do set SERVER_IP=%%I
echo   %SERVER_IP%
echo.

:: Start BenAlus Backend (port 3000)
echo  [1/2] Menjalankan Backend BenAlus (port 3000)...
if exist "%INSTALL_DIR%\benalus-backend\server.cjs" (
    start "BenAlus Backend" /MIN node "%INSTALL_DIR%\benalus-backend\server.cjs"
) else (
    echo  [WARN] Backend BenAlus tidak ditemukan, skip...
)

:: Tunggu sebentar agar backend siap
timeout /t 2 /nobreak >nul

:: Start RainFlow Frontend (port 5173)
echo  [2/2] Menjalankan Frontend RainFlow (port 5173)...
cd /d "%INSTALL_DIR%"
start "RainFlow Frontend" /MIN cmd /c "npm run dev -- --host 2>&1"

:: Tunggu frontend siap
timeout /t 5 /nobreak >nul

echo.
echo  =====================================================
echo   SEMUA LAYANAN AKTIF!
echo  =====================================================
echo.
echo  Akses dari browser:
echo    Buka : http://%SERVER_IP%:5173
echo.
echo  Bagikan alamat ini ke siapa saja yang ingin mengakses
echo  RainFlow dari luar RDP ini.
echo.
echo  [Jangan tutup jendela ini selama aplikasi digunakan]
echo.

:: Buka browser otomatis
start "" "http://localhost:5173"

pause
