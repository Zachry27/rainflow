@echo off
title BenAlus Premium Server
color 0b

echo =========================================
echo    BENALUS WEB PREMIUM - STARTUP
echo =========================================
echo.
echo [1] Menjalankan Server Backend (Node.js)...
start /B node server.cjs

echo [2] Menjalankan Server UI (Vite)...
start /B npm run dev -- --host

echo.
echo Menyiapkan Browser...
timeout /t 4 /nobreak >nul

echo [3] Membuka Aplikasi di Browser...
start http://localhost:5173/

echo.
echo =========================================
echo Aplikasi BERHASIL dijalankan!
echo Biarkan jendela hitam ini tetap terbuka
echo selama Anda menggunakan aplikasi.
echo =========================================
pause
