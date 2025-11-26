@echo off
echo ==========================================
echo Talio HRMS - Quick RELEASE APK Build
echo ==========================================
echo.
echo Building RELEASE version for production
echo URL: https://app.talio.in
echo.
echo NOTE: Use quick-build-debug.bat for local testing
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

echo Building APK...
cd /d "%~dp0"
call gradlew.bat clean assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==========================================
    echo ✓ BUILD SUCCESSFUL!
    echo ==========================================
    echo.
    echo APK Location:
    echo %~dp0app\build\outputs\apk\release\app-release.apk
    echo.
    
    REM Copy to Downloads
    if not exist "%USERPROFILE%\Downloads\Talio-Release" mkdir "%USERPROFILE%\Downloads\Talio-Release"
    copy /Y app\build\outputs\apk\release\app-release.apk "%USERPROFILE%\Downloads\Talio-Release\Talio-HRMS-FCM.apk"
    
    echo.
    echo ✓ APK copied to: %USERPROFILE%\Downloads\Talio-Release\Talio-HRMS-FCM.apk
    echo.
) else (
    echo.
    echo ✗ BUILD FAILED
    echo.
)

pause
