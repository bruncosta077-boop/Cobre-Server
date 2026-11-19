@echo off
chcp 65001 >nul
title Cobre ID - servidor
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto instalar

node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if errorlevel 1 goto atualizar
goto rodar

:instalar
echo O Cobre ID precisa do Node.js. Vou instalar agora (so na primeira vez).
echo Se o Windows pedir permissao, clique em Sim.
echo.
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
if errorlevel 1 (
  echo.
  echo Nao consegui instalar sozinho. Baixe o Node.js em https://nodejs.org ^(versao LTS^), instale e abra este arquivo de novo.
  start https://nodejs.org
  pause
  exit /b 1
)
echo.
echo Instalado! FECHE esta janela e abra "Iniciar Cobre ID" de novo.
pause
exit /b 0

:atualizar
echo Seu Node.js e antigo demais. Vou atualizar.
winget upgrade -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
echo.
echo FECHE esta janela e abra "Iniciar Cobre ID" de novo. Se continuar assim, instale o Node.js LTS em https://nodejs.org
pause
exit /b 0

:rodar
echo Se o Windows perguntar sobre o Firewall, clique em PERMITIR.
echo Deixe esta janela aberta (pode minimizar). Para parar, feche-a.
echo.
:loop
node server.js
echo.
echo O servidor parou. Reiniciando em 3 segundos...
timeout /t 3 /nobreak >nul
goto loop
