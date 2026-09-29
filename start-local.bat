@echo off
rem This file stays ASCII-only on purpose: cmd.exe mangles Chinese text in .bat
rem files (it parses each line using the console codepage). All the actual
rem messages live in start-local.ps1, which handles UTF-8 properly.
where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1"
)
