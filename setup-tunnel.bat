@echo off
setlocal EnableDelayedExpansion

set "PROJECT_DIR=%~dp0"
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"
set "CLOUDFLARED_EXE=%PROJECT_DIR%\cloudflared.exe"

echo.
echo  =====================================================
20: echo   Cloudflare Tunnel Setup (Vibe Coder Mode)
echo  =====================================================
echo.

if not exist "%CLOUDFLARED_EXE%" (
    echo  [!] cloudflared.exe tidak ditemukan.
    echo  [+] Mendownload cloudflared dari GitHub...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%CLOUDFLARED_EXE%'"
    if %ERRORLEVEL% equ 0 (
        echo  [OK] Download selesai!
    ) else (
        echo  [ERROR] Gagal mendownload. Silakan cek koneksi internet.
        pause
        exit /b 1
    )
) else (
    echo  [OK] cloudflared.exe sudah siap.
)

:: Cek Token di .env
findstr /C:"CLOUDFLARE_TUNNEL_TOKEN" "%PROJECT_DIR%\.env" >nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo  [WARNING] Token belum ada di .env!
    set /p "USER_TOKEN=Masukkan Cloudflare Tunnel Token kamu: "
    echo CLOUDFLARE_TUNNEL_TOKEN=!USER_TOKEN! >> "%PROJECT_DIR%\.env"
    echo  [OK] Token disimpan ke .env.
)

echo.
echo  Setup selesai! Sekarang kamu bisa pakai custom domain.
echo  Pastikan di Cloudflare Dashboard kamu sudah mengarahkan Public Hostname 
echo  (misal: app.domain.com) ke http://localhost:5173
echo.
pause
