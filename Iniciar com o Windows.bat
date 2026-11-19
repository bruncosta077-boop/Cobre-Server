@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup')+'\Cobre ID.lnk'); $s.TargetPath='%~dp0Iniciar Cobre ID.bat'; $s.WorkingDirectory='%~dp0'; $s.WindowStyle=7; $s.Save()"
if errorlevel 1 (
  echo Nao deu certo. Tente de novo.
) else (
  echo Pronto! O Cobre ID vai ligar sozinho (minimizado) quando o Windows iniciar.
  echo Para desfazer, apague o atalho "Cobre ID" da pasta que abrir ao digitar shell:startup no Executar ^(Win+R^).
)
pause
