# How to Fix Orientation Lock Issue

## The Problem
The app is still rotating to landscape even though we've locked it to portrait.

## Solution Steps

### 1. **STOP the app completely**
   - Close the app on your emulator/device
   - Stop Metro bundler (Ctrl+C in the terminal where it's running)

### 2. **Clean the Android build**
   ```bash
   cd BeefiveApp/android
   ./gradlew clean
   cd ../..
   ```

   Or on Windows PowerShell:
   ```powershell
   cd BeefiveApp\android
   .\gradlew.bat clean
   cd ..\..
   ```

### 3. **Clear Metro bundler cache**
   ```bash
   npx react-native start --reset-cache
   ```
   (Run this in a separate terminal and keep it running)

### 4. **Rebuild and run the app**
   In a NEW terminal:
   ```bash
   cd BeefiveApp
   npx react-native run-android
   ```

### 5. **Verify the changes are applied**
   - The app should now stay in portrait mode
   - Try rotating your emulator - the app should NOT rotate

## If it STILL rotates:

### Check 1: Verify MainActivity.kt has the lock code
   The file `BeefiveApp/android/app/src/main/java/com/beefive/MainActivity.kt` should contain:
   - `lockOrientation()` function
   - `onCreate()`, `onResume()`, and `onConfigurationChanged()` methods that call `lockOrientation()`

### Check 2: Verify AndroidManifest.xml
   The file `BeefiveApp/android/app/src/main/AndroidManifest.xml` should have:
   - `android:screenOrientation="portrait"` on the MainActivity
   - `android:configChanges` should NOT include `orientation`

### Check 3: Uninstall and reinstall
   ```bash
   adb uninstall com.beefive
   npx react-native run-android
   ```

### Check 4: Check emulator settings
   - Some emulators have "Auto-rotate" settings that might interfere
   - Try disabling auto-rotate in emulator settings

## What We Changed

1. **MainActivity.kt**: Added orientation locking in `onCreate()`, `onResume()`, and `onConfigurationChanged()`
2. **AndroidManifest.xml**: Removed `orientation` from `android:configChanges` and kept `android:screenOrientation="portrait"`

These changes require a **full rebuild** to take effect - that's why cleaning and rebuilding is essential!



