@echo off
setlocal EnableDelayedExpansion

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "CLOUDFLARED_EXE=%PROJECT_DIR%\cloudflared.exe"

echo.
echo  =====================================================
echo   Cloudflare Tunnel Setup (Vibe Coder Mode)
echo  =====================================================
echo.

if not exist "%CLOUDFLARED_EXE%" (
    echo  [!] file cloudflared.exe BELUM ADA di folder ini.
    echo.
    echo  CARA INSTALL MANUAL:
    echo  1. Buka link ini di browser: 
    echo     https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
    echo  2. Setelah download, RENAME filenya jadi: cloudflared.exe
    echo  3. PINDAHKAN file itu ke folder ini: 
    echo     %PROJECT_DIR%
    echo.
    echo  Setelah kamu pindahkan filenya, jalankan lagi script ini.
    echo.
    pause
    exit /b 1
)

echo  [OK] cloudflared.exe ditemukan! Lanjut...

:: Cek Token di .env
findstr /C:"CLOUDFLARE_TUNNEL_TOKEN" "%PROJECT_DIR%\.env" >nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [WARNING] Token belum ada di .env!
    echo  Silakan paste Token dari Cloudflare Dashboard kamu di bawah.
    echo  (Cara ambil token ada di chat Antigravity sebelumnya)
    echo.
    set /p "USER_TOKEN=Paste Token Kamu: "
    echo. >> "%PROJECT_DIR%\.env"
    echo CLOUDFLARE_TUNNEL_TOKEN=!USER_TOKEN! >> "%PROJECT_DIR%\.env"
    echo  [OK] Token berhasil disimpan ke .env.
) else (
    echo  [OK] Token sudah ada di .env.
)

echo.
echo  =====================================================
echo   SETUP SELESAI!
echo  =====================================================
echo  Sekarang kamu bisa jalankan MULAI.BAT
echo  Domain kamu bakal otomatis aktif.
echo.
pause
