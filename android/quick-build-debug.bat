@echo off
echo ==========================================
echo Talio HRMS - Quick DEBUG APK Build
echo ==========================================
echo.
echo Building DEBUG version for local testing
echo URL: http://10.0.2.2:3000 (Android Emulator)
echo      OR http://localhost:3000 (if on same device)
echo.
echo NOTE: If testing on physical device, update the URL in:
echo       android/app/build.gradle (debug buildConfigField)
echo       to your computer's local IP (e.g., http://192.168.1.100:3000)
echo.

REM Wait for Android Studio SDK
:CHECK_SDK
if not exist "%LOCALAPPDATA%\Android\Sdk" (
    echo Waiting for Android SDK installation...
    echo Please complete Android Studio first-time setup
    timeout /t 5 >nul
    goto CHECK_SDK
)

echo ✓ Android SDK found!
echo.

REM Set environment variables
set JAVA_HOME=C:\Program Files\Java\jdk-17
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%

echo Building DEBUG APK...
cd /d "%~dp0"
call gradlew.bat clean assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==========================================
    echo ✓ BUILD SUCCESSFUL!
    echo ==========================================
    echo.
    echo APK Location:
    echo %~dp0app\build\outputs\apk\debug\app-debug.apk
    echo.
    
    REM Copy to Downloads
    if not exist "%USERPROFILE%\Downloads\Talio-Debug" mkdir "%USERPROFILE%\Downloads\Talio-Debug"
    copy /Y app\build\outputs\apk\debug\app-debug.apk "%USERPROFILE%\Downloads\Talio-Debug\Talio-HRMS-Debug.apk"
    
    echo.
    echo ✓ APK copied to: %USERPROFILE%\Downloads\Talio-Debug\Talio-HRMS-Debug.apk
    echo.
    echo TESTING INSTRUCTIONS:
    echo 1. Make sure your backend server is running: npm run dev
    echo 2. Install the APK on your device
    echo 3. App will connect to http://10.0.2.2:3000 (emulator) or localhost
    echo 4. For physical device, you need to update the URL first
    echo.
) else (
    echo.
    echo ✗ BUILD FAILED
    echo.
)

pause
