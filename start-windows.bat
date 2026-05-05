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
    echo  Jalankan install-windows.bat terlebih dahulu.
    pause
    exit /b 1
)

:: Tampilkan IP Server
echo  [INFO] IP Address server ini:
for /f "tokens=*" %%I in ('powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } | Select-Object -ExpandProperty IPAddress | Select-Object -First 1"') do set SERVER_IP=%%I
echo   %SERVER_IP%
echo.

:: ── Start Backend BenAlus (port 3000) ──
echo  [1/2] Menjalankan Backend BenAlus (port 3000)...
if exist "%INSTALL_DIR%\benalus-backend\server.cjs" (
    start "BenAlus Backend" /MIN node "%INSTALL_DIR%\benalus-backend\server.cjs"
    echo  [OK] Backend BenAlus berjalan di port 3000.
) else (
    echo  [WARN] Backend BenAlus tidak ditemukan di:
    echo         %INSTALL_DIR%\benalus-backend\server.cjs
    echo         Jalankan install-windows.bat untuk install ulang.
)
echo.

:: Tunggu backend siap
timeout /t 3 /nobreak >nul

:: ── Start Frontend RainFlow (port 5173) ──
echo  [2/2] Menjalankan Frontend RainFlow (port 5173)...
start "RainFlow Frontend" /MIN cmd /c "cd /d "%INSTALL_DIR%" && npm run dev -- --host"
echo  [OK] Frontend RainFlow berjalan di port 5173.
echo.

:: Tunggu frontend siap
timeout /t 6 /nobreak >nul

echo.
echo  =====================================================
echo   SEMUA LAYANAN AKTIF
echo  =====================================================
echo.
echo  Akses dari browser:
echo    Buka : http://%SERVER_IP%:5173
echo.
echo  Frontend  : http://%SERVER_IP%:5173
echo  Backend   : http://%SERVER_IP%:3000
echo.
echo  [Jangan tutup jendela ini selama aplikasi digunakan]
echo  [Tutup jendela ini = matikan server]
echo.

:: Buka browser otomatis
start "" "http://localhost:5173"

pause
