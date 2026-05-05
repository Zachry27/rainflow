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
    echo  [OK] Port 5173 [Frontend] berhasil dibuka.
)

netsh advfirewall firewall show rule name="BenAlus Backend 3000" >nul 2>&1
if %errorLevel% EQU 0 (
    echo  [OK] Rule firewall port 3000 sudah ada, skip...
) else (
    netsh advfirewall firewall add rule name="BenAlus Backend 3000" dir=in action=allow protocol=TCP localport=3000
    echo  [OK] Port 3000 [Backend BenAlus] berhasil dibuka.
)
echo.

:: ============================================================
::  STEP 6 - CLONE & SETUP RainFlow
:: ============================================================
echo  [6/6] Setup RainFlow...

set INSTALL_DIR=%USERPROFILE%\rainflow

:: Clone atau pull
if exist "%INSTALL_DIR%\.git" (
    echo  [INFO] Folder sudah ada, melakukan git pull...
    git -C "%INSTALL_DIR%" pull origin main
    if %errorLevel% NEQ 0 (
        echo  [WARN] Git pull gagal, lanjutkan dengan versi yang ada...
    )
) else (
    echo  [INFO] Clone repo RainFlow dari GitHub...
    git clone https://github.com/Zachry27/rainflow.git "%INSTALL_DIR%"
    if %errorLevel% NEQ 0 (
        echo  [ERROR] Git clone gagal! Periksa koneksi internet.
        pause
        exit /b 1
    )
    echo  [OK] Clone selesai!
)

:: Pastikan folder ada sebelum npm install
if not exist "%INSTALL_DIR%\package.json" (
    echo  [ERROR] package.json tidak ditemukan di %INSTALL_DIR%
    echo  Clone gagal atau repo kosong.
    pause
    exit /b 1
)

echo  [INFO] Menginstall dependencies frontend...
pushd "%INSTALL_DIR%"
call npm install
popd
echo  [OK] Dependencies frontend siap!
echo.

:: ── Tampilkan IP server ──
echo  [INFO] IP Address server ini:
powershell -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object -ExpandProperty IPAddress"

echo.
echo  =====================================================
echo   INSTALASI SELESAI
echo  =====================================================
echo.
echo  Lokasi folder : %INSTALL_DIR%
echo  Jalankan app  : Klik 2x file "start-windows.bat"
echo.
echo  Akses dari browser (dari PC lain):
echo    Frontend  : http://[IP-SERVER]:5173
echo    Backend   : http://[IP-SERVER]:3000
echo.
echo  TIPS: Jalankan start-windows.bat untuk start semua sekaligus
echo.

set /p RUNAPP= Jalankan RainFlow sekarang? (y/n): 
if /i "%RUNAPP%"=="y" (
    echo.
    echo  [INFO] Menjalankan RainFlow...
    call "%INSTALL_DIR%\start-windows.bat"
)

pause
