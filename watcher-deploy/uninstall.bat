@echo off
chcp 65001 >nul
title Optic Up - הסרת Watcher
echo מסיר את שירות ה-Watcher...
cd /d %~dp0
node uninstall-service.js
echo.
echo השירות הוסר בהצלחה.
pause
