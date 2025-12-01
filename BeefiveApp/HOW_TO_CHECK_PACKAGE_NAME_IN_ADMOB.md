# How to Check and Update Package Name in AdMob

## Why This Matters

The Package/Bundle ID in AdMob **MUST match** the package name in your app code. If they don't match, ads won't work properly.

**Your actual Android package name:** `com.beefive`

## How to Check Your Package Name in AdMob

### Step 1: Go to Your App in AdMob

1. Go to [AdMob Console](https://admob.google.com/)
2. Click **"Apps"** in the left sidebar
3. Click on your app name (the one with App ID: `ca-app-pub-6740638137327567~4018684365`)

### Step 2: View App Settings

1. Click the **"App settings"** tab (usually at the top of the page)
2. Look for the **"Package name"** field (for Android) or **"Bundle ID"** field (for iOS)

You should see something like:
- **Package name:** `com.beefive` ← Should match your app!

## What to Look For

### ✅ Correct Package Name:
- **Package name:** `com.beefive` ← Matches your app code ✅

### ❌ Wrong Package Name:
- **Package name:** `com.beefiveapp` ← Old package name ❌
- **Package name:** `com.example.app` ← Wrong package name ❌
- **Package name:** Empty or missing ❌

## How to Update Package Name (If Needed)

⚠️ **Important:** You can only update the package name if:
- Your app is **not yet published** to Google Play Store
- You haven't created ad units yet (or you're willing to recreate them)

### If Your Package Name is Wrong:

Unfortunately, **AdMob doesn't allow editing the package name** after creating the app. You have two options:

### Option 1: Delete and Recreate the App (Recommended if not published)

1. Go to **Apps** → Select your app
2. Click **"App settings"** tab
3. Scroll down and look for **"Delete app"** option
4. Delete the app
5. Create a new app with the correct package name: `com.beefive`

**Note:** You'll need to:
- Save your App ID before deleting (if you want to keep using it)
- Create ad units again after recreating

### Option 2: Create a New App (Keep the old one)

1. Create a **new app** in AdMob with package name `com.beefive`
2. Get the new App ID
3. Update your `AndroidManifest.xml` with the new App ID
4. The old app can stay (you won't use it)

## Quick Check - What's Your Package Name?

To find out what you entered (or if you entered anything):

1. **In AdMob:**
   - Apps → [Your App] → App settings
   - Look at "Package name" field

2. **In Your Code:**
   - Check `BeefiveApp/android/app/build.gradle`
   - Look for: `applicationId "com.beefive"`

They should match! ✅

## If You Didn't Enter a Package Name

If the package name field is empty in AdMob:
- This is a problem - you need to recreate the app
- Follow Option 1 or Option 2 above
- Make sure to enter `com.beefive` as the package name

## Summary

1. ✅ Your app code uses: `com.beefive`
2. ✅ Your AdMob app should use: `com.beefive`
3. ✅ Check in AdMob: Apps → [Your App] → App settings → Package name
4. ❌ If they don't match, recreate the app in AdMob with the correct package name

---

**Next Steps:**
After verifying/fixing the package name, you can:
1. Create ad units
2. Get ad unit IDs
3. Configure your app with ad unit IDs

