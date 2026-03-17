@echo off
chcp 65001 >nul
title Optic Up - הסרת Watcher

REM ── Request admin elevation if not already elevated ──
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo מבקש הרשאות מנהל...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d %~dp0

echo ============================================
echo   Optic Up - הסרת שירות סנכרון
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [שגיאה] Node.js לא נמצא ב-PATH.
    echo הורד מ: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo מסיר את שירות ה-Watcher...
echo.
node uninstall-service.js
if %ERRORLEVEL% neq 0 (
    echo.
    echo [שגיאה] הסרת השירות נכשלה. ראה הודעות למעלה.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   השירות הוסר בהצלחה!
echo ============================================
echo.
pause
