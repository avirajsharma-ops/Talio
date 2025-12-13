@echo off
REM Build script for Talio Desktop App (Windows)

echo.
echo Talio Desktop App Build Script
echo ==================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

REM Install dependencies
echo.
echo Installing dependencies...
call npm install

REM Build
echo.
echo Building Windows installer...
call npm run build:win

echo.
echo Build complete!
echo.
echo Output files in: %~dp0dist\
dir dist\ 2>nul

pause
