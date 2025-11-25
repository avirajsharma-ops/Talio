@echo off
cls
echo ========================================
echo    HRMS System - Automated Setup
echo ========================================
echo.

echo [1/4] Installing dependencies...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)
echo.
echo ✓ Dependencies installed successfully!
echo.

echo [2/4] Checking MongoDB...
echo.
mongosh --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: MongoDB is not installed or not in PATH
    echo.
    echo Please install MongoDB from:
    echo https://www.mongodb.com/try/download/community
    echo.
    echo After installing MongoDB, run this script again.
    pause
    exit /b 1
)
echo ✓ MongoDB is installed!
echo.

echo [3/4] Starting MongoDB...
echo.
net start MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo Note: MongoDB might already be running or needs manual start
    echo.
) else (
    echo ✓ MongoDB started successfully!
    echo.
)

echo [4/4] Creating demo users...
echo.
call npm run seed
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to seed database
    echo Please make sure MongoDB is running and try again.
    pause
    exit /b 1
)
echo.

cls
echo ========================================
echo    🎉 Setup Complete!
echo ========================================
echo.
echo ✓ Dependencies installed
echo ✓ MongoDB running
echo ✓ Demo users created
echo.
echo ========================================
echo    📋 Login Credentials
echo ========================================
echo.
echo Admin:
echo   Email: admin@hrms.com
echo   Password: admin123
echo.
echo HR Manager:
echo   Email: hr@hrms.com
echo   Password: hr123
echo.
echo Manager:
echo   Email: manager@hrms.com
echo   Password: manager123
echo.
echo Employee:
echo   Email: employee@hrms.com
echo   Password: employee123
echo.
echo ========================================
echo.
echo To start the application, run:
echo   npm run dev
echo.
echo Then open your browser at:
echo   http://localhost:3000
echo.
echo ========================================
echo.
pause

