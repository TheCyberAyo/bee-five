@echo off
REM Build script for generating Android App Bundle (AAB) for Google Play Store
REM Usage: build-aab.bat

echo ==========================================
echo Building Bee Five AAB for Play Store
echo ==========================================
echo.

REM Check if keystore.properties exists
if not exist "keystore.properties" (
    echo WARNING: keystore.properties not found!
    echo    Release builds require a keystore for signing.
    echo    Run generate-keystore.bat first, or create keystore.properties manually.
    echo.
    set /p continue="Continue with debug signing? (yes/no): "
    if /i not "%continue%"=="yes" (
        echo Aborted. Please set up keystore first.
        exit /b 1
    )
)

echo Step 1: Cleaning previous builds...
call gradlew clean

echo.
echo Step 2: Building AAB...
call gradlew bundleRelease

if %errorlevel% equ 0 (
    echo.
    echo AAB built successfully!
    echo.
    echo Location: app\build\outputs\bundle\release\app-release.aab
    echo.
    echo Next steps:
    echo 1. Upload the AAB to Google Play Console
    echo 2. Complete the Data Safety form
    echo 3. Complete the store listing
    echo 4. Submit for review
    echo.
) else (
    echo.
    echo Build failed. Please check the errors above.
    exit /b 1
)



















