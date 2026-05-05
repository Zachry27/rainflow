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
set BACKEND_DIR=%INSTALL_DIR%\benalus-backend

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

:: ── Pastikan dependencies backend terinstall ──
if not exist "%BACKEND_DIR%\node_modules" (
    echo  [INFO] node_modules belum ada, install dependencies backend dulu...
    pushd "%BACKEND_DIR%"
    call npm install
    popd
    echo  [OK] Dependencies backend siap.
    echo.
)

:: ── Start Backend BenAlus (port 3000) ──
echo  [1/2] Menjalankan Backend BenAlus (port 3000)...
if exist "%BACKEND_DIR%\server.cjs" (
    start "BenAlus Backend" cmd /c "node "%BACKEND_DIR%\server.cjs" & echo. & echo [Backend berhenti - tutup jendela ini] & pause"
    timeout /t 3 /nobreak >nul
    :: Verifikasi backend beneran jalan
    powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/settings' -UseBasicParsing -TimeoutSec 3; Write-Host ' [OK] Backend BenAlus VERIFIED berjalan.' } catch { Write-Host ' [WARN] Backend mungkin belum siap, tunggu sebentar...' }"
) else (
    echo  [WARN] server.cjs tidak ditemukan di: %BACKEND_DIR%
    echo  Coba jalankan: git pull, lalu start lagi.
)
echo.

:: ── Pastikan dependencies frontend terinstall ──
if not exist "%INSTALL_DIR%\node_modules" (
    echo  [INFO] node_modules frontend belum ada, install dulu...
    pushd "%INSTALL_DIR%"
    call npm install
    popd
    echo  [OK] Dependencies frontend siap.
    echo.
)

:: ── Start Frontend RainFlow (port 5173) ──
echo  [2/2] Menjalankan Frontend RainFlow (port 5173)...
start "RainFlow Frontend" cmd /c "cd /d "%INSTALL_DIR%" && npm run dev -- --host"

:: Tunggu frontend siap
timeout /t 6 /nobreak >nul

echo.
echo  =====================================================
echo   SEMUA LAYANAN AKTIF
echo  =====================================================
echo.
echo  Akses dari browser (dari PC/HP lain):
echo    Buka : http://%SERVER_IP%:5173
echo.
echo  [Jangan tutup jendela ini selama aplikasi digunakan]
echo  [Tutup jendela ini = matikan server]
echo.

:: Buka browser otomatis
start "" "http://localhost:5173"

pause
