# How to Change Android Package Name

## ⚠️ Important Note

You cannot use "Bee Five" as a package name because:
- ❌ Package names cannot contain spaces
- ❌ Package names cannot contain hyphens
- ❌ Package names must be lowercase
- ✅ Must follow reverse domain format: `com.yourcompany.appname`

## Valid Alternatives

If you want something close to "Bee Five", here are valid options:

1. **`com.beefive`** ⭐ (Recommended - clean and simple)
2. **`com.bee.five`** (Separates words with dots)
3. **`com.beefiveapp`** (Old package name - now changed to `com.beefive`)

## What Needs to Be Changed

Changing the package name requires updates in multiple places:

### Android:
- ✅ `android/app/build.gradle` - `namespace` and `applicationId`
- ✅ `android/app/src/main/AndroidManifest.xml` - if referenced
- ✅ All Kotlin/Java files - package declarations
- ✅ Directory structure - move files to new package folder
- ✅ Any native modules that reference the package

### iOS:
- Bundle ID can be changed in Xcode project settings
- Less complex than Android

## Warning

⚠️ **Changing package name is a breaking change!**
- You'll need to update AdMob with the new package name
- Existing installations won't update properly
- Make sure you haven't published to stores yet, or plan for a new app listing

## Current Package Name

Your Android package name is now: **`com.beefive`**

This is perfectly valid! You don't need to change it unless you have a specific reason.

