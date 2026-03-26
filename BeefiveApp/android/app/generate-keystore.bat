@echo off
REM Script to generate a release keystore for Bee Five app
REM Run this from the android/app directory

echo ==========================================
echo Bee Five Release Keystore Generator
echo ==========================================
echo.
echo This script will help you generate a keystore for signing your release builds.
echo IMPORTANT: Keep your keystore file and passwords secure!
echo.

REM Check if keystore already exists
if exist "release.keystore" (
    echo WARNING: release.keystore already exists!
    set /p overwrite="Do you want to overwrite it? (yes/no): "
    if /i not "%overwrite%"=="yes" (
        echo Aborted.
        exit /b 1
    )
    del /f release.keystore
)

echo Please provide the following information:
echo.

REM Get keystore details
set /p store_password="Keystore password (save this securely!): "
set /p store_password_confirm="Re-enter keystore password: "

if not "%store_password%"=="%store_password_confirm%" (
    echo Passwords don't match. Aborted.
    exit /b 1
)

set /p key_alias="Key alias [beefive-release-key]: "
if "%key_alias%"=="" set key_alias=beefive-release-key

set /p key_password="Key password (can be same as keystore): "

set /p validity="Validity in days [10000]: "
if "%validity%"=="" set validity=10000

set /p name="Your name [MindGrind]: "
if "%name%"=="" set name=MindGrind

set /p org="Organization [MindGrind]: "
if "%org%"=="" set org=MindGrind

set /p city="City: "
set /p state="State/Province: "
set /p country="Country code (2 letters) [ZA]: "
if "%country%"=="" set country=ZA

echo.
echo Generating keystore...

REM Generate keystore
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias "%key_alias%" -keyalg RSA -keysize 2048 -validity %validity% -storepass "%store_password%" -keypass "%key_password%" -dname "CN=%name%, OU=Development, O=%org%, L=%city%, ST=%state%, C=%country%"

if %errorlevel% equ 0 (
    echo.
    echo Keystore generated successfully!
    echo.
    echo Next steps:
    echo 1. Navigate to the android directory: cd ..
    echo 2. Create keystore.properties file: copy keystore.properties.example keystore.properties
    echo 3. Edit keystore.properties and add the following content:
    echo.
    echo MYAPP_RELEASE_STORE_FILE=app/release.keystore
    echo MYAPP_RELEASE_KEY_ALIAS=%key_alias%
    echo MYAPP_RELEASE_STORE_PASSWORD=%store_password%
    echo MYAPP_RELEASE_KEY_PASSWORD=%key_password%
    echo.
    echo 4. Keep your keystore and passwords secure!
) else (
    echo.
    echo Failed to generate keystore. Please check the errors above.
    exit /b 1
)



















