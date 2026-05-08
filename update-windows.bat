@echo off
title RainFlow Updater
color 0B
setlocal EnableDelayedExpansion
echo.
echo  =====================================================
echo   RainFlow UPDATER
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

set INSTALL_DIR=%USERPROFILE%\rainflow
if not exist "%INSTALL_DIR%" (
    echo  [ERROR] Folder instalasi tidak ditemukan di: %INSTALL_DIR%
    echo  Pastikan kamu sudah menjalankan install-windows.bat terlebih dahulu.
    echo.
    pause
    exit /b 1
)
cd /d "%INSTALL_DIR%"

:: ============================================================
::  STEP 1 - STOP APP JIKA SEDANG BERJALAN
:: ============================================================
echo  [1/4] Mencoba stop proses Node.js yang berjalan...
taskkill /F /IM node.exe >nul 2>&1
if %errorLevel% EQU 0 (
    echo  [OK] Proses Node.js berhasil dihentikan.
) else (
    echo  [INFO] Tidak ada proses Node.js yang berjalan, lanjut...
)
echo.

:: ============================================================
::  STEP 2 - BACKUP FILE SETTINGS LOKAL
:: ============================================================
echo  [2/4] Backup file settings lokal...

set SETTINGS_FILE=benalus-backend\settings.json
set SETTINGS_BACKUP=benalus-backend\settings.json.bak

if exist "%SETTINGS_FILE%" (
    copy /Y "%SETTINGS_FILE%" "%SETTINGS_BACKUP%" >nul
    echo  [OK] settings.json berhasil di-backup.
) else (
    echo  [INFO] settings.json tidak ditemukan, skip backup.
)

:: Reset file yang sering konflik agar git pull tidak gagal
git checkout -- "%SETTINGS_FILE%" >nul 2>&1
echo.

:: ============================================================
::  STEP 3 - GIT PULL (ambil update terbaru dari GitHub)
:: ============================================================
echo  [3/4] Mengambil update terbaru dari GitHub...
git pull origin main
if %errorLevel% NEQ 0 (
    echo  [ERROR] Git pull gagal! Periksa koneksi internet atau status repo.
    :: Restore backup jika pull gagal
    if exist "%SETTINGS_BACKUP%" (
        copy /Y "%SETTINGS_BACKUP%" "%SETTINGS_FILE%" >nul
        del "%SETTINGS_BACKUP%" >nul
        echo  [INFO] settings.json dikembalikan dari backup.
    )
    echo.
    pause
    exit /b 1
)

:: Restore settings.json dari backup setelah pull berhasil
if exist "%SETTINGS_BACKUP%" (
    copy /Y "%SETTINGS_BACKUP%" "%SETTINGS_FILE%" >nul
    del "%SETTINGS_BACKUP%" >nul
    echo  [OK] settings.json milikmu berhasil dikembalikan.
)

echo  [OK] Update berhasil didownload!
echo.

:: ============================================================
::  STEP 4 - NPM INSTALL (install dependency baru jika ada)
:: ============================================================
echo  [4/4] Menginstall dependency baru (jika ada)...
call npm install --prefer-offline
if %errorLevel% NEQ 0 (
    echo  [WARN] npm install mengalami masalah, coba lanjutkan...
)
echo  [OK] Dependency siap!
echo.

:: ============================================================
::  SELESAI
:: ============================================================
echo  =====================================================
echo   UPDATE SELESAI!
echo  =====================================================
echo.
echo  Versi terbaru sudah terinstall di: %INSTALL_DIR%
echo.

set /p RUNAPP= Jalankan RainFlow sekarang? (y/n): 
if /i "%RUNAPP%"=="y" (
    echo.
    echo  [INFO] Menjalankan RainFlow...
    call "%INSTALL_DIR%\start-windows.bat"
)
pause