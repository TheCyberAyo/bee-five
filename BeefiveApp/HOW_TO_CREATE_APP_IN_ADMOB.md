# How to Create Your App in AdMob Console

This guide walks you through creating your Bee-Five app in the AdMob console step-by-step.

## Prerequisites

Before you start, make sure you have:
- ✅ AdMob account created and approved
- ✅ Your app's package name (Android) and bundle ID (iOS)

## Step 1: Login to AdMob Console

1. Go to [https://admob.google.com/](https://admob.google.com/)
2. Sign in with your Google account
3. You'll see the AdMob dashboard

## Step 2: Find Your App Identifiers

### For Android - Package Name:
Your Android package name is: **`com.beefive`**

To verify:
- Check `BeefiveApp/android/app/build.gradle`
- Look for `applicationId "com.beefive"`

### For iOS - Bundle ID:
Your iOS bundle ID might be: **`org.reactjs.native.example.BeefiveApp`**

To verify:
1. Open your project in Xcode
2. Select your project in the navigator
3. Select your app target
4. Go to the "General" tab
5. Look at "Bundle Identifier"

**Note:** If you've changed it, use your actual bundle ID. It should be in reverse domain format like `com.yourcompany.beefiveapp` or `com.beefive`.

## Step 3: Create Android App in AdMob

1. In AdMob console, click **"Apps"** in the left sidebar menu
2. Click the **"+ Add app"** button (usually at the top of the page)
3. You'll see a dialog asking "Have you published this app on Google Play Store?"

### Option A: App Not Yet Published (Most Common)
- Select **"No"**
- Click **"Continue"**
- Choose **"Android"** as the platform
- Enter your app details:
  - **App name:** `Bee-Five` (or whatever you want to call it in AdMob)
  - **Package name:** `com.beefive`
- Click **"Add app"**

### Option B: App Already Published
- Select **"Yes"**
- Click **"Continue"**
- Search for your app or enter the package name manually
- Click **"Add app"**

## Step 4: Get Your Android App ID

After creating your Android app:

1. You'll see a success screen with your **App ID**
2. Your App ID looks like: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`
3. **Copy this App ID** - you'll need it later!

**Where to find it later:**
- Go to **Apps** → Click on your app name
- Look at the top of the page - your App ID is displayed there
- Or go to **App settings** tab to see it

## Step 5: Create iOS App in AdMob

Repeat the process for iOS:

1. Click **"Apps"** in the left sidebar
2. Click **"+ Add app"**
3. Select **"No"** (if not yet published) or **"Yes"** (if published)
4. Choose **"iOS"** as the platform
5. Enter your app details:
   - **App name:** `Bee-Five` (same name is fine, or different if you prefer)
   - **Bundle ID:** Your iOS bundle ID (check in Xcode as described above)
     - If you haven't changed it, it's likely: `org.reactjs.native.example.BeefiveApp`
6. Click **"Add app"**

## Step 6: Get Your iOS App ID

After creating your iOS app:

1. Copy your iOS **App ID** (same format: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`)
2. Save it somewhere safe

## Step 7: Save Your Information

**Important:** Save all these IDs before continuing:

### Android:
- **App ID:** `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`
- **Package Name:** `com.beefiveapp`

### iOS:
- **App ID:** `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`
- **Bundle ID:** (your bundle ID from Xcode)

## Visual Guide - What You'll See

### Step-by-Step Flow:

```
AdMob Dashboard
    ↓
Click "Apps" (left sidebar)
    ↓
Click "+ Add app" button
    ↓
Choose "No" (not published yet)
    ↓
Choose Platform (Android or iOS)
    ↓
Enter App Name and Package/Bundle ID
    ↓
Click "Add app"
    ↓
See your App ID! ✨
```

## Troubleshooting

### "Package name already exists"
- This means another AdMob account already has this package name
- Double-check you're using the correct package name
- If you're sure it's correct, you might need to contact AdMob support

### "Invalid package name format"
- Android package names should be in format: `com.example.appname`
- iOS bundle IDs should be in format: `com.example.appname` or similar
- Make sure there are no spaces or special characters

### "Can't find my Bundle ID"
**For iOS, to find your exact Bundle ID:**
1. Open `BeefiveApp/ios/BeefiveApp.xcworkspace` in Xcode
2. Click on your project name in the left navigator
3. Select your app target (BeefiveApp)
4. Click the "General" tab
5. Look at "Identity" section → "Bundle Identifier"
6. Copy that exact value

### I Already Created the App - How Do I Find the App ID?
1. Go to **Apps** in AdMob console
2. Click on your app name
3. Your App ID is displayed at the top of the page
4. Or go to the **App settings** tab

## Next Steps

After creating both apps and getting your App IDs:

1. ✅ Add Android App ID to `AndroidManifest.xml`
2. ✅ Add iOS App ID to `Info.plist`
3. ✅ Create ad units (see next guide)
4. ✅ Configure ad mediator with ad unit IDs

See `ADMOB_ACCOUNT_APPROVED_NEXT_STEPS.md` for the complete setup process.

## Quick Reference

| Platform | Package/Bundle ID | Where to Find It |
|----------|------------------|------------------|
| Android  | `com.beefive` | `android/app/build.gradle` → `applicationId` |
| iOS      | Check in Xcode   | Xcode → Target → General → Bundle Identifier |

---

**Ready?** Let's create those apps! 🚀

