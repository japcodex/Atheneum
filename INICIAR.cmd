@echo off
setlocal
title Atheneum - Biblioteca pessoal
where node >nul 2>nul
if errorlevel 1 (
  echo O Atheneum precisa do Node.js para iniciar o servidor local.
  echo Instale o Node.js pelo site oficial https://nodejs.org/ e tente novamente.
  pause
  exit /b 1
)
if not exist "%~dp0..\.dev\start.mjs" (
  echo O iniciador local precisa da pasta de apoio .dev que acompanha o projeto.
  echo Para hospedagem, publique somente o conteudo desta pasta dist.
  pause
  exit /b 1
)
node "%~dp0..\.dev\start.mjs"
if errorlevel 1 pause
