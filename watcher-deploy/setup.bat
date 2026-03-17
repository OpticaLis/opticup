@echo off
chcp 65001 >nul
title Optic Up - התקנת Watcher

REM ── Request admin elevation if not already elevated ──
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo מבקש הרשאות מנהל...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d %~dp0

echo ============================================
echo   Optic Up - התקנת שירות סנכרון
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [שגיאה] Node.js לא מותקן.
    echo הורד מ: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [1/4] מתקין חבילות...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [שגיאה] התקנת חבילות נכשלה
    echo.
    pause
    exit /b 1
)

echo.
echo [2/4] הגדרות:
echo.
set /p OPTICUP_KEY="הדבק את ה-Service Role Key מ-Supabase: "
echo.
set /p WATCH_DIR="הדבק את הנתיב לתיקיית sales (Enter לברירת מחדל: C:\Users\User\Dropbox\InventorySync\sales): "
if "%WATCH_DIR%"=="" set WATCH_DIR=C:\Users\User\Dropbox\InventorySync\sales
echo.
set /p EXPORT_DIR="הדבק את הנתיב לתיקיית new (Enter לברירת מחדל: C:\Users\User\Dropbox\InventorySync\new): "
if "%EXPORT_DIR%"=="" set EXPORT_DIR=C:\Users\User\Dropbox\InventorySync\new

echo.
echo [3/4] מתקין שירות Windows...
node install-service.js --key=%OPTICUP_KEY% --watch-dir="%WATCH_DIR%" --export-dir="%EXPORT_DIR%"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [שגיאה] התקנת השירות נכשלה. ראה הודעות למעלה.
    echo.
    pause
    exit /b 1
)

echo.
echo [4/4] סיום!
echo.
echo ============================================
echo   ההתקנה הושלמה בהצלחה!
echo   השירות ירוץ אוטומטית ברקע.
echo   לבדיקה: inventory.html → סנכרון Access → Watcher פעיל
echo ============================================
echo.
pause
