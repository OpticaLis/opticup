@echo off
chcp 65001 >nul
title Optic Up - התקנת Watcher

echo ============================================
echo   Optic Up - התקנת שירות סנכרון
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [שגיאה] Node.js לא מותקן.
    echo הורד מ: https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] מתקין חבילות...
cd /d %~dp0
call npm install
if %ERRORLEVEL% neq 0 (
    echo [שגיאה] התקנת חבילות נכשלה
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
