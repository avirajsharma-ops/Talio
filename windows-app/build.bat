@echo off
REM Talio Activity Monitor - Windows Build Script
REM Run this on a Windows machine to build the installer

echo.
echo ========================================
echo  Talio Activity Monitor - Build Script
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found.
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

REM Navigate to script directory
cd /d "%~dp0"

echo.
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo Generating icons...
call node scripts/generate-icons.js

echo.
echo Building Windows installers...
echo This may take a few minutes...
echo.

call npm run build:win
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo  BUILD COMPLETE!
echo ========================================
echo.
echo Output files in: %~dp0release\
echo.

dir /b release\*.exe 2>nul

echo.
echo Done! The installers are ready.
pause

