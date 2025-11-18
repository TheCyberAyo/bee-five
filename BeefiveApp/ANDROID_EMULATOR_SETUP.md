# Android Development Setup Guide

This guide will walk you through setting up Android development for the BeefiveApp React Native project. You can use a physical Android device, an Android Emulator, or cloud-based emulators.

## Prerequisites

1. **Android Studio** must be installed on your system
   - Download from: https://developer.android.com/studio
   - Make sure you have the latest version installed

2. **Android SDK** should be installed through Android Studio
   - Open Android Studio → SDK Manager
   - Install Android SDK Platform-Tools and at least one Android SDK Platform

## Option 1: Use a Physical Android Device (Recommended)

### Advantages

- **Real device performance** - Test on actual hardware with native performance
- **No emulator crashes** - More stable than emulators
- **Better for testing touch, sensors, and real-world conditions** - Test actual touch interactions, accelerometer, gyroscope, GPS, camera, etc.
- **Faster than emulators on many systems** - Physical devices often run faster than emulators, especially on systems with limited resources

### How to Set It Up

#### Step 1: Enable Developer Options on Your Android Device

1. Open **Settings** on your Android device
2. Navigate to **About Phone** (or **About Device**)
3. Find **Build Number** in the list
4. **Tap "Build Number" 7 times** in quick succession
   - You'll see a message like "You are now a developer!" after the 7th tap
5. Developer Options will now be available in your Settings menu

#### Step 2: Enable USB Debugging

1. Go back to **Settings**
2. Navigate to **Developer Options** (usually under System or Advanced settings)
3. Toggle **USB Debugging** to **ON**
   - You may see a warning about USB debugging - tap **OK** to confirm
4. (Optional but recommended) Enable **Stay awake** to keep the screen on while charging
5. (Optional) Enable **Install via USB** if you want to install apps directly via USB

#### Step 3: Connect via USB

1. Connect your Android phone to your laptop using a USB cable
2. On your phone, you'll see a prompt asking **"Allow USB debugging?"**
   - Check **"Always allow from this computer"** if you want to skip this prompt in the future
   - Tap **OK** or **Allow**
3. If this is the first time connecting, you may need to unlock your phone and enter your PIN/password

#### Step 4: Verify Connection

1. Open a terminal/command prompt on your laptop
2. Run the following command:
   ```bash
   adb devices
   ```
3. You should see your device listed with status "device", for example:
   ```
   List of devices attached
   ABC123XYZ456    device
   ```
   - If you see "unauthorized", check your phone for the USB debugging prompt and accept it
   - If you see "offline", try disconnecting and reconnecting the USB cable
   - If nothing appears, see the Troubleshooting section below

#### Step 5: Run Your App

1. **Start Metro Bundler** (if not already running):
   ```bash
   cd BeefiveApp
   npm start
   # OR
   yarn start
   ```

2. **In a new terminal, run the Android app:**
   ```bash
   cd BeefiveApp
   npm run android
   # OR
   yarn android
   ```

3. The app should build and launch on your physical device automatically!

### What Should Happen on Your Device Screen

After successfully completing all setup steps and running `npm run android`, here's what you should see on your Android device:

#### During Setup:
1. **When you connect via USB:**
   - A popup appears: **"Allow USB debugging?"**
   - Tap **"Allow"** or **"OK"**
   - Optionally check **"Always allow from this computer"**

2. **After accepting USB debugging:**
   - Your device screen returns to normal (home screen or whatever app you were using)
   - You may see a notification in the notification bar indicating USB debugging is connected

#### When Running `npm run android`:

1. **During the build process (in terminal):**
   - You'll see build output in your terminal
   - This may take 1-3 minutes for the first build

2. **On your device screen - Installation:**
   - You may see a notification: **"Installing [App Name]"** or **"Installing BeefiveApp"**
   - Your device screen might briefly show an installation dialog
   - The screen may wake up if it was locked

3. **On your device screen - App Launch:**
   - **The React Native app should automatically open** and appear on your device screen
   - You should see your app's UI (typically the initial screen/component)
   - The app is now running and connected to Metro bundler

4. **What the app looks like:**
   - Your app's splash screen (if configured) or main screen
   - Any initial components/screens you've defined in your React Native app
   - If you have a debugger or dev menu configured, those may be available

#### If Metro Bundler is Running:
- Any code changes you make will automatically reload on your device
- You'll see a reload notification or the app will refresh automatically
- This is the "hot reload" feature working

#### Expected Behavior:
- ✅ App appears on your device screen automatically
- ✅ App is fully functional and responsive
- ✅ Changes in your code reload automatically (if Metro bundler is running)
- ✅ You can interact with the app normally on your device

#### If Nothing Happens on Your Device:
- Check that `adb devices` still shows your device as "device" (not "offline" or "unauthorized")
- Ensure your phone screen is unlocked
- Check that the app installed successfully (look in your app drawer for the app icon)
- Manually launch the app from your app drawer if it didn't auto-launch
- Check the terminal for any error messages

### Requirements

- **Android device** (Android 7.0+ based on your minSdkVersion)
- **USB cable** (preferably a data cable, not just a charging cable)
- **USB drivers** (usually auto-installed on Windows 10/11, or install from device manufacturer)
  - Samsung: [Samsung USB Drivers](https://developer.samsung.com/mobile/android-usb-driver.html)
  - Google Pixel: Usually auto-detected
  - Other manufacturers: Check their developer websites

### Troubleshooting Physical Device Connection

#### Device Not Detected by ADB

1. **Check USB connection:**
   - Try a different USB cable (some cables are charge-only)
   - Try a different USB port on your laptop
   - Ensure the cable is securely connected

2. **Check USB mode on device:**
   - When connected, pull down the notification shade
   - Tap the USB notification
   - Select **"File Transfer"** or **"MTP"** mode (not "Charging only")

3. **Restart ADB server:**
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

4. **Check USB drivers:**
   - On Windows, open Device Manager
   - Look for your device under "Portable Devices" or "Other devices"
   - If it shows with a yellow warning, right-click → Update driver
   - Install drivers from your device manufacturer if needed

5. **Revoke USB debugging authorizations:**
   - On your phone: Settings → Developer Options → **Revoke USB debugging authorizations**
   - Disconnect and reconnect your device
   - Accept the prompt again

#### "Unauthorized" Status

- Check your phone screen for the USB debugging prompt
- Tap **Allow** or **OK**
- Check the "Always allow from this computer" box if you want to skip this in the future

#### "Offline" Status

If your device shows as `offline` in `adb devices`, try these solutions in order:

1. **Restart ADB server** (most common fix):
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

2. **Check USB mode on your device:**
   - Pull down the notification shade on your phone
   - Tap the USB notification (usually says "USB for file transfer" or "USB connected")
   - Select **"File Transfer"** or **"MTP"** mode (NOT "Charging only")
   - Wait a few seconds and check `adb devices` again

3. **Unplug and reconnect the USB cable:**
   - Unplug the USB cable from both your phone and laptop
   - Wait 5 seconds
   - Reconnect the cable
   - Check your phone for the USB debugging prompt and accept it if it appears
   - Run `adb devices` again

4. **Revoke and re-authorize USB debugging:**
   - On your phone: Settings → Developer Options → **Revoke USB debugging authorizations**
   - Disconnect the USB cable
   - Wait 10 seconds
   - Reconnect the USB cable
   - On your phone, you should see a prompt asking "Allow USB debugging?"
   - Check **"Always allow from this computer"** and tap **OK**
   - Run `adb devices` - it should now show as "device" instead of "offline"

5. **Try a different USB cable:**
   - Some USB cables are charge-only and don't support data transfer
   - Try using the original cable that came with your phone, or a known data cable

6. **Try a different USB port:**
   - Use a USB port directly on your laptop (avoid USB hubs if possible)
   - Try both USB-A and USB-C ports if available

7. **Restart your phone:**
   - Sometimes a simple restart can fix connection issues
   - After restarting, reconnect via USB and check `adb devices`

If none of these work, check that USB drivers are properly installed (see "Device Not Detected by ADB" section above).

#### Build/Install Errors

- Ensure your device meets the minimum Android version (7.0+)
- Check that USB debugging is enabled
- Try running `adb devices` to verify connection
- Restart both Metro bundler and the build process

## Option 2: Use Android Emulator

### Step-by-Step Configuration

### Step 1: Open Android Studio

1. Launch **Android Studio**
2. If you have a project open, you can access AVD Manager from:
   - **Tools** → **Device Manager** (in newer versions)
   - OR **Tools** → **AVD Manager** (in older versions)
   - OR click the **Device Manager** icon in the toolbar

### Step 2: Access AVD Manager

1. In Android Studio, click on **More Actions** → **Virtual Device Manager**
   - OR go to **Tools** → **Device Manager**
   - OR use the toolbar icon that looks like a phone/tablet

2. The **Device Manager** window will open showing your virtual devices

### Step 3: Create a New Virtual Device

1. Click the **Create Device** button (or **+ Create Device**)

2. **Select Hardware:**
   - Choose a device definition (e.g., **Pixel 7**, **Pixel 6**, **Pixel 5**)
   - For React Native development, **Pixel 7** or **Pixel 6** are good choices
   - Click **Next**

3. **Select System Image:**
   - Choose an Android version (API level)
   - **Your app requirements:**
     - **Minimum:** Android 7.0 (API 24) - Your app's minSdkVersion
     - **Target:** Android 15 (API 36) - Your app's targetSdkVersion
   - **Recommended for React Native:**
     - **Android 15 (API 36)** - Matches your targetSdkVersion (if available)
     - **Android 14 (API 34)** - Latest stable
     - **Android 13 (API 33)** - Good compatibility
     - **Android 12 (API 31)** - Widely supported
   
   - If the system image shows **Download** next to it, click **Download** to install it first
   - Wait for the download and installation to complete
   - Click **Next**

4. **Verify Configuration:**
   - **AVD Name:** Give it a descriptive name (e.g., "Pixel_7_API_33")
   - **Startup orientation:** Portrait (default) or Landscape
   - **Advanced Settings** (optional):
     - **RAM:** 2048 MB minimum (4096 MB recommended for better performance)
     - **VM heap:** 512 MB
     - **Internal Storage:** 2048 MB minimum
     - **SD Card:** Optional (can add later if needed)
   
   - Click **Finish**

### Step 4: Configure Emulator Settings (Optional but Recommended)

1. In the **Device Manager**, find your newly created emulator
2. Click the **Edit** icon (pencil) next to your emulator
3. Click **Show Advanced Settings**
4. Recommended settings:
   - **RAM:** 4096 MB (if your system has enough RAM)
   - **VM heap:** 512 MB
   - **Internal Storage:** 4096 MB
   - **SD Card:** 512 MB (optional)
   - **Graphics:** 
     - **Automatic** (default) - Good for most cases
     - **Hardware - GLES 2.0** - Better performance if supported
   - **Camera:** 
     - **Webcam0** (if you have a webcam)
     - **None** (if you don't need camera)
   - **Network Speed:** Full
   - **Network Latency:** None

5. Click **Finish** to save changes

### Step 5: Start the Emulator

1. In the **Device Manager**, find your emulator
2. Click the **Play** button (▶) next to your emulator
3. Wait for the emulator to boot (this may take 1-2 minutes the first time)
4. The emulator window will open showing the Android home screen

### Step 6: Verify Emulator is Running

1. Open a terminal/command prompt
2. Run the following command to verify the emulator is detected:
   ```bash
   adb devices
   ```
3. You should see your emulator listed (e.g., `emulator-5554   device`)

### Step 7: Run Your React Native App

1. **Start Metro Bundler:**
   ```bash
   cd BeefiveApp
   npm start
   # OR
   yarn start
   ```

2. **In a new terminal, run the Android app:**
   ```bash
   cd BeefiveApp
   npm run android
   # OR
   yarn android
   ```

3. The app should build and launch on your emulator automatically!

## Troubleshooting

### Emulator Won't Start
- **Check HAXM/Windows Hypervisor:** 
  - On Windows, ensure Windows Hypervisor Platform is enabled
  - On Mac, ensure Intel HAXM is installed
- **Check System Requirements:** Ensure your system meets minimum requirements
- **Try Cold Boot:** In Device Manager, click the dropdown arrow next to Play → **Cold Boot Now**

### Emulator is Slow
- Increase **RAM allocation** in emulator settings
- Enable **Hardware acceleration** in graphics settings
- Close other applications to free up system resources
- Use a **x86_64** system image instead of ARM

### ADB Command Not Found (`'adb' is not recognized`)
This means the Android SDK Platform-Tools are not in your system PATH. Here's how to fix it:

#### Step 1: Find Your Android SDK Location
The Android SDK is typically located in one of these locations on Windows:
- `C:\Users\<YourUsername>\AppData\Local\Android\Sdk`
- `C:\Android\Sdk`
- Or check in Android Studio: **File** → **Settings** → **Appearance & Behavior** → **System Settings** → **Android SDK** → Look at "Android SDK Location"

#### Step 2: Add Platform-Tools to PATH (Windows)

**Option A: Temporary Fix (Current Session Only)**

**For PowerShell:**
```powershell
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
adb version
```

**For Command Prompt (CMD):**
```cmd
set PATH=%PATH%;%LOCALAPPDATA%\Android\Sdk\platform-tools
adb version
```

This will work for your current terminal session only. Close and reopen the terminal to use the permanent PATH.

**Option B: Permanent Fix (Recommended)**
1. Press `Win + X` and select **System**
2. Click **Advanced system settings** (or search for "Environment Variables")
3. Click **Environment Variables** button
4. Under **System variables**, find and select **Path**, then click **Edit**
5. Click **New** and add:
   ```
   C:\Users\<YourUsername>\AppData\Local\Android\Sdk\platform-tools
   ```
   (Replace `<YourUsername>` with your actual username, or use the path from Step 1)
6. Click **OK** on all dialogs
7. **Close and reopen** your terminal/PowerShell window
8. Verify it works:
   ```powershell
   adb version
   ```

**Option C: Quick Test Without PATH**
You can also run `adb` directly using the full path:

**PowerShell:**
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
```

**Command Prompt:**
```cmd
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" devices
```

**Note:** If PATH was already added permanently but you still get the error, **close and reopen your terminal window** - existing sessions don't automatically pick up PATH changes.

#### Step 3: Verify Platform-Tools Are Installed
If `adb.exe` doesn't exist in the `platform-tools` folder:
1. Open **Android Studio**
2. Go to **File** → **Settings** → **Appearance & Behavior** → **System Settings** → **Android SDK**
3. Click the **SDK Tools** tab
4. Check **Android SDK Platform-Tools**
5. Click **Apply** to install

### ADB Not Detecting Emulator
- Ensure the emulator is fully booted (wait for home screen)
- Run `adb kill-server` then `adb start-server`
- Check that Android SDK Platform-Tools are installed and in PATH

### Build Errors
- Ensure your `minSdkVersion` in `android/app/build.gradle` matches or is lower than your emulator's API level
- Run `cd android && ./gradlew clean` to clean the build
- Check that all Android SDK components are installed

## Recommended Emulator Configurations

### For Development (Fast Performance)
- **Device:** Pixel 7 or Pixel 8
- **API Level:** 34 (Android 14) or 36 (Android 15) if available
- **RAM:** 4096 MB
- **Graphics:** Hardware - GLES 2.0

### For Testing (Multiple Versions)
Create multiple emulators with different API levels to test compatibility:
- **Pixel 8 API 36** (Android 15) - Matches your targetSdkVersion
- **Pixel 7 API 34** (Android 14) - Latest stable
- **Pixel 6 API 33** (Android 13) - Good compatibility
- **Pixel 5 API 31** (Android 12) - Widely supported
- **Pixel 4 API 24** (Android 7.0) - Minimum supported version

## Option 3: Cloud-based Emulators

Cloud-based emulators allow you to run Android emulators in the cloud without installing Android Studio or using local system resources. This is useful if:
- Your local machine doesn't have enough resources for emulators
- You want to test on multiple devices/versions without creating local emulators
- You need to run emulators on CI/CD pipelines

### Popular Cloud Emulator Services

1. **Firebase Test Lab**
   - Google's cloud-based testing infrastructure
   - Free tier available
   - Supports both physical devices and emulators
   - [Firebase Test Lab Documentation](https://firebase.google.com/docs/test-lab)

2. **BrowserStack**
   - Cloud-based device testing platform
   - Real devices and emulators available
   - [BrowserStack App Testing](https://www.browserstack.com/app-testing)

3. **Sauce Labs**
   - Cloud-based mobile app testing
   - Real devices and emulators
   - [Sauce Labs Mobile Testing](https://saucelabs.com/mobile-testing)

4. **AWS Device Farm**
   - Amazon's cloud-based device testing service
   - Real devices and emulators
   - [AWS Device Farm Documentation](https://docs.aws.amazon.com/devicefarm/)

### Setting Up Cloud Emulators

The setup process varies by service, but generally involves:
1. Creating an account with the cloud service
2. Uploading your APK or connecting your build pipeline
3. Selecting device configurations (device model, Android version)
4. Running tests and viewing results

**Note:** For local development, physical devices (Option 1) or local emulators (Option 2) are typically faster and more convenient. Cloud emulators are best suited for automated testing and CI/CD pipelines.

## Additional Resources

- [Android Studio AVD Manager Documentation](https://developer.android.com/studio/run/managing-avds)
- [React Native Android Setup](https://reactnative.dev/docs/environment-setup)
- [Android Emulator Performance](https://developer.android.com/studio/run/emulator-acceleration)
- [Android USB Drivers](https://developer.android.com/studio/run/win-usb)

