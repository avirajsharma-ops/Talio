@echo off
echo ========================================
echo Talio HRMS - Windows APK Build Script
echo ========================================
echo.

REM Set Java Home (update this path if needed)
if exist "C:\Program Files\Java\jdk-17" (
    set JAVA_HOME=C:\Program Files\Java\jdk-17
) else if exist "C:\Program Files\Java\jdk-11" (
    set JAVA_HOME=C:\Program Files\Java\jdk-11
) else if exist "C:\Program Files\Android\Android Studio\jbr" (
    set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
) else (
    echo ERROR: Java not found. Please install Java JDK 11 or 17
    pause
    exit /b 1
)

echo Java Home: %JAVA_HOME%
echo.

REM Clean previous build
echo Step 1: Cleaning previous builds...
call gradlew.bat clean
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Clean failed
    pause
    exit /b 1
)
echo Done!
echo.

REM Build Release APK
echo Step 2: Building Release APK...
call gradlew.bat assembleRelease
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo Done!
echo.

REM Copy APK to easier location
echo Step 3: Copying APK...
set OUTPUT_DIR=..\release
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

copy /Y app\build\outputs\apk\release\app-release.apk "%OUTPUT_DIR%\Talio-HRMS-FCM.apk"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Copy failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo APK Location: %OUTPUT_DIR%\Talio-HRMS-FCM.apk
echo.
echo Next Steps:
echo 1. Transfer APK to your Android phone
echo 2. Install the APK
echo 3. Start the server: npm run dev
echo 4. Login and test notifications
echo.
pause
