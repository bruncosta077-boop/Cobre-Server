@echo off
chcp 65001 >nul
title Cobre Server - Aplicativo desktop
cd /d "%~dp0"
if exist "%~dp0release\win-unpacked\Cobre Server.exe" (
  start "" "%~dp0release\win-unpacked\Cobre Server.exe"
  exit /b 0
)
echo Este atalho e para desenvolvimento. Para usar o Cobre Server, baixe e extraia
echo Cobre-Server-*-Windows-x64.zip em GitHub ^> Actions ^> Build Cobre Server.
echo Depois abra "Cobre Server.exe" na pasta extraida.
echo.
pause
