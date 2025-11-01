@echo off
echo ========================================
echo HRMS Installation Script
echo ========================================
echo.

echo Step 1: Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed successfully!
echo.

echo Step 2: Checking MongoDB...
mongosh --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Warning: MongoDB is not installed or not in PATH
    echo Please install MongoDB from https://www.mongodb.com/try/download/community
    echo.
) else (
    echo MongoDB is installed!
    echo.
)

echo Step 3: Starting MongoDB...
net start MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo Note: MongoDB service might already be running or needs manual start
    echo.
) else (
    echo MongoDB started successfully!
    echo.
)

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure MongoDB is running
echo 2. Run: npm run dev
echo 3. Open: http://localhost:3000
echo 4. Create admin user using the API
echo.
echo For detailed instructions, see QUICK_START.md
echo.
pause

