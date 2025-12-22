# Fixing PlatformConstants TurboModule Error

If you encounter the error: `'PlatformConstants' could not be found. Verify that a module by this name is registered in the native binary.`

## Quick Fix Steps

1. **Uninstall the app from your device/emulator**
   - Go to Settings > Apps > BeefiveApp > Uninstall
   - Or run: `adb uninstall com.beefive`

2. **Stop Metro bundler** (if running)
   - Press `Ctrl+C` in the terminal where Metro is running

3. **Clear all caches and rebuild:**
   ```powershell
   # Stop Gradle daemons
   cd android
   .\gradlew --stop
   cd ..

   # Clear Metro cache and start with reset
   npm run start:reset
   ```

4. **In a NEW terminal, rebuild and install:**
   ```powershell
   npm run android
   ```

## If the error persists:

1. **Run the fix script:**
   ```powershell
   .\fix-platform-constants.ps1
   ```

2. **Then rebuild:**
   ```powershell
   npm run start:reset
   # In another terminal:
   npm run android
   ```

## Root Cause

This error typically occurs when:
- Metro bundler cache is stale
- Native build is out of sync with JavaScript bundle
- Old app version is still installed on device
- Gradle build cache is corrupted

The fix script clears all these caches and ensures a clean rebuild.




