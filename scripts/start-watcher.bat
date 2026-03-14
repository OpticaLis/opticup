@echo off
title Optic Up - Inventory Sync Watcher
echo ============================================
echo   Optic Up - Inventory Sync Watcher v2.0
echo ============================================
echo.

REM === CONFIGURATION ===
REM Get your key from: Supabase Dashboard > Settings > API > service_role > Reveal
REM Replace YOUR_KEY_HERE with the actual service_role key (one time setup)
set OPTICUP_SERVICE_ROLE_KEY=YOUR_KEY_HERE

REM Change this path to match the Dropbox sync folder on this computer
set OPTICUP_WATCH_DIR=C:\Users\User\Dropbox\InventorySync\sales

REM === DO NOT EDIT BELOW THIS LINE ===
cd /d %~dp0\..

:start
echo [%date% %time%] Starting watcher...
node scripts\sync-watcher.js
echo.
echo [%date% %time%] Watcher stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak
goto start
