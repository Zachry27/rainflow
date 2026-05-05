@echo off
title RainFlow Auto Installer
color 0A
setlocal EnableDelayedExpansion

echo.
echo  =====================================================
echo   RainFlow AUTO INSTALLER FOR WINDOWS RDP
echo   github.com/Zachry27/rainflow
echo  =====================================================
echo.

:: --- Check Administrator ---
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo  [ERROR] Jalankan script ini sebagai ADMINISTRATOR!
    echo  Klik kanan file .bat ini lalu pilih "Run as Administrator"
    echo.
    pause
    exit /b 1
)
echo  [OK] Running sebagai Administrator
echo.

:: ============================================================
::  STEP 1 - INSTALL CHOCOLATEY
:: ============================================================
echo  [1/6] Mengecek Chocolatey...
where choco >nul 2>&1
if %errorLevel% EQU 0 (
    echo  [OK] Chocolatey sudah terinstall, skip...
) else (
    echo  [INFO] Menginstall Chocolatey...
    @powershell -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"
    echo  [OK] Chocolatey berhasil diinstall!
)
echo.

:: ============================================================
::  STEP 2 - INSTALL NODE.JS
:: ============================================================
echo  [2/6] Mengecek Node.js...
where node >nul 2>&1
if %errorLevel% EQU 0 (
    echo  [OK] Node.js sudah terinstall, skip...
) else (
    echo  [INFO] Menginstall Node.js LTS...
    choco install nodejs-lts -y
    echo  [OK] Node.js berhasil diinstall!
)
echo.

:: ============================================================
::  STEP 3 - INSTALL GIT
:: ============================================================
echo  [3/6] Mengecek Git...
where git >nul 2>&1
if %errorLevel% EQU 0 (
    echo  [OK] Git sudah terinstall, skip...
) else (
    echo  [INFO] Menginstall Git...
    choco install git -y
    echo  [OK] Git berhasil diinstall!
)
echo.

:: ============================================================
::  STEP 4 - INSTALL FFMPEG (dibutuhkan backend BenAlus)
:: ============================================================
echo  [4/6] Mengecek FFmpeg...
where ffmpeg >nul 2>&1
if %errorLevel% EQU 0 (
    echo  [OK] FFmpeg sudah terinstall, skip...
) else (
    echo  [INFO] Menginstall FFmpeg...
    choco install ffmpeg -y
    echo  [OK] FFmpeg berhasil diinstall!
)
echo.

:: ============================================================
::  STEP 5 - BUKA PORT FIREWALL (5173 Frontend + 3000 Backend)
:: ============================================================
echo  [5/6] Membuka port 5173 dan 3000 di Windows Firewall...

netsh advfirewall firewall show rule name="RainFlow Frontend 5173" >nul 2>&1
if %errorLevel% EQU 0 (
    echo  [OK] Rule firewall port 5173 sudah ada, skip...
) else (
    netsh advfirewall firewall add rule name="RainFlow Frontend 5173" dir=in action=allow protocol=TCP localport=5173
    echo  [OK] Port 5173 (Frontend) berhasil dibuka!
)

netsh advfirewall firewall show rule name="BenAlus Backend 3000" >nul 2>&1
if %errorLevel% EQU 0 (
    echo  [OK] Rule firewall port 3000 sudah ada, skip...
) else (
    netsh advfirewall firewall add rule name="BenAlus Backend 3000" dir=in action=allow protocol=TCP localport=3000
    echo  [OK] Port 3000 (Backend BenAlus) berhasil dibuka!
)
echo.

:: ============================================================
::  STEP 6 - CLONE & SETUP RainFlow
:: ============================================================
echo  [6/6] Setup RainFlow...

call refreshenv >nul 2>&1

set INSTALL_DIR=%USERPROFILE%\rainflow

if exist "%INSTALL_DIR%" (
    echo  [INFO] Folder sudah ada di: %INSTALL_DIR%
    echo  [INFO] Melakukan git pull untuk update...
    cd /d "%INSTALL_DIR%"
    git pull origin main
) else (
    echo  [INFO] Clone repo RainFlow dari GitHub...
    git clone https://github.com/Zachry27/rainflow.git "%INSTALL_DIR%"
    echo  [OK] Clone selesai!
)

cd /d "%INSTALL_DIR%"

echo  [INFO] Menginstall dependencies frontend (npm install)...
call npm install

:: ── Setup Backend BenAlus ──
set BACKEND_DIR=%INSTALL_DIR%\benalus-backend
if not exist "%BACKEND_DIR%" mkdir "%BACKEND_DIR%"

:: Copy server.cjs ke folder backend jika belum ada
if not exist "%BACKEND_DIR%\server.cjs" (
    echo  [INFO] Menyalin file backend BenAlus...
    copy /Y "%INSTALL_DIR%\benalus-backend\*" "%BACKEND_DIR%\" >nul 2>&1
)

:: Install backend dependencies
if exist "%BACKEND_DIR%\package.json" (
    cd /d "%BACKEND_DIR%"
    echo  [INFO] Menginstall dependencies backend BenAlus...
    call npm install
)

cd /d "%INSTALL_DIR%"

:: ── Tampilkan IP server ──
echo.
echo  [INFO] IP Address server ini:
powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress"

echo.
echo  =====================================================
echo   INSTALASI SELESAI!
echo  =====================================================
echo.
echo  Lokasi folder : %INSTALL_DIR%
echo  Jalankan app  : Klik 2x file "start-windows.bat"
echo.
echo  Akses dari browser (dari PC lain):
echo    Frontend  : http://[IP-SERVER]:5173
echo    Backend   : http://[IP-SERVER]:3000
echo.
echo  TIPS: Jalankan start-windows.bat untuk start semua sekaligus!
echo.

set /p RUNAPP= Jalankan RainFlow sekarang? (y/n): 
if /i "%RUNAPP%"=="y" (
    echo.
    echo  [INFO] Menjalankan RainFlow...
    call "%INSTALL_DIR%\start-windows.bat"
)

pause
