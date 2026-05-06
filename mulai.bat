@echo off
title RainFlow All-in-One Starter
color 0A
setlocal EnableDelayedExpansion

:: Dapatkan folder tempat mulai.bat ini berada (tidak peduli di drive C atau D)
set "PROJECT_DIR=%~dp0"
:: Hilangkan trailing backslash jika ada
if "%PROJECT_DIR:~-1%"=="\" set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo.
echo  =====================================================
echo   RainFlow All-in-One STARTER
echo   Lokasi: %PROJECT_DIR%
echo  =====================================================
echo.

:: ── Start Backend Python (GrokPI - port 9564) ──
echo  [1/3] Menjalankan Backend Python (port 9564)...
start "Python Backend" cmd /c "cd /d "%PROJECT_DIR%\backend" && call "START BACKEND.bat""

:: ── Start Backend BenAlus (port 3000) ──
echo  [2/3] Menjalankan Backend BenAlus (port 3000)...
start "BenAlus Backend" cmd /c "cd /d "%PROJECT_DIR%\benalus-backend" && node server.cjs & echo. & echo [Backend berhenti] & pause"

:: ── Start Frontend RainFlow (port 5173) ──
echo  [3/3] Menjalankan Frontend RainFlow (port 5173)...
start "RainFlow Frontend" cmd /c "cd /d "%PROJECT_DIR%" && npm run dev -- --host"

:: ── Start Cloudflare Tunnel (Custom Domain) ──
set "TUNNEL_TOKEN="
for /f "tokens=2 delims==" %%a in ('findstr "CLOUDFLARE_TUNNEL_TOKEN" "%PROJECT_DIR%\.env"') do set "TUNNEL_TOKEN=%%a"

if not "!TUNNEL_TOKEN!"=="" (
    echo  [4/3] Menjalankan Cloudflare Tunnel (Custom Domain)...
    if exist "%PROJECT_DIR%\cloudflared.exe" (
        start "Cloudflare Tunnel" cmd /c "cd /d "%PROJECT_DIR%" && cloudflared.exe tunnel run --token !TUNNEL_TOKEN!"
    ) else (
        echo      [!] cloudflared.exe tidak ditemukan. Jalankan setup-tunnel.bat dulu.
    )
)

:: Tunggu 5 detik agar semua server siap
echo.
echo  Menunggu server menyala...
timeout /t 5 /nobreak >nul

echo.
echo  =====================================================
echo   SEMUA LAYANAN AKTIF!
echo  =====================================================
echo  Jangan tutup jendela hitam yang baru terbuka.
echo.

:: Buka browser otomatis
start "" "http://localhost:5173"

pause
