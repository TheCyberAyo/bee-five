# How to Get Your AdMob IDs

This guide will walk you through getting your AdMob App ID and Ad Unit IDs step by step.

## Step 1: Create/Login to AdMob Account

1. Go to [Google AdMob](https://admob.google.com/)
2. Sign in with your Google account
3. If you don't have an account, click "Get Started" and follow the setup process

## Step 2: Get Your App ID

The **App ID** is a unique identifier for your app in AdMob. You need one App ID per platform (Android and iOS).

### For Android:

1. In AdMob console, click **Apps** in the left sidebar
2. Click **Add app** (or select your existing app)
3. Choose **Android** as the platform
4. Enter your app details:
   - App name: "Bee-Five" (or your app name)
   - Package name: `com.beefive` (check your `android/app/build.gradle` for the actual package name)
5. Click **Add app**
6. You'll see your **App ID** - it looks like: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`
7. **Copy this App ID** - you'll need it for `AndroidManifest.xml`

### For iOS:

1. In AdMob console, click **Apps** in the left sidebar
2. Click **Add app** (or select your existing app)
3. Choose **iOS** as the platform
4. Enter your app details:
   - App name: "Bee-Five" (or your app name)
   - Bundle ID: Check your Xcode project settings (should be in reverse domain format like `com.beefive`)
5. Click **Add app**
6. You'll see your **App ID** - it looks like: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`
7. **Copy this App ID** - you'll need it for `Info.plist`

## Step 3: Get Your Ad Unit IDs

Ad Unit IDs are specific to each ad format (Banner, Interstitial, Rewarded). You need separate ad units for Android and iOS.

### Create Ad Units:

1. In AdMob console, go to **Apps** → Select your app
2. Click **Ad units** tab
3. Click **Add ad unit**
4. Select the ad format:
   - **Banner**: For banner ads at top/bottom of screens
   - **Interstitial**: For full-screen ads between game levels
   - **Rewarded**: For ads that reward users (extra lives, coins, etc.)
5. Enter a name for your ad unit (e.g., "Banner - Main Menu")
6. Click **Create ad unit**
7. You'll see your **Ad Unit ID** - it looks like: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`
8. **Copy this Ad Unit ID**

### Repeat for Each Ad Format:

Create separate ad units for:
- ✅ Banner (Android)
- ✅ Banner (iOS)
- ✅ Interstitial (Android)
- ✅ Interstitial (iOS)
- ✅ Rewarded (Android)
- ✅ Rewarded (iOS)

**Important**: Make sure to create separate ad units for Android and iOS platforms!

## Step 4: Where to Use These IDs

### App ID (One per platform):

**Android** - Add to `BeefiveApp/android/app/src/main/AndroidManifest.xml`:
```xml
<application>
    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"/>
</application>
```

**iOS** - Add to `BeefiveApp/ios/BeefiveApp/Info.plist`:
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX</string>
```

### Ad Unit IDs (Multiple - one per ad format per platform):

Update in your code where you initialize the ad mediator. You can do this in `App.tsx`:

```typescript
import { initializeAdMediator } from './src/services/adMediator';

await initializeAdMediator({
  testMode: false, // Set to false when using production IDs
  adUnits: {
    banner: {
      adType: 'banner',
      testUnitId: 'ca-app-pub-3940256099942544/6300978111', // Keep test ID for development
      productionUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Your Android Banner ID
      position: 'bottom',
      size: 'banner',
    },
    interstitial: {
      adType: 'interstitial',
      testUnitId: 'ca-app-pub-3940256099942544/1033173712',
      productionUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Your Android Interstitial ID
    },
    rewarded: {
      adType: 'rewarded',
      testUnitId: 'ca-app-pub-3940256099942544/5224354917',
      productionUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Your Android Rewarded ID
    },
  },
});
```

**Note**: For iOS, you'll need separate ad unit IDs. You can detect the platform and use different IDs:

```typescript
import { Platform } from 'react-native';

const bannerId = Platform.OS === 'ios' 
  ? 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' // iOS Banner ID
  : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // Android Banner ID
```

## Step 5: Test IDs (For Development)

While developing, use these **test ad unit IDs** to avoid policy violations:

**Android Test IDs:**
- Banner: `ca-app-pub-3940256099942544/6300978111`
- Interstitial: `ca-app-pub-3940256099942544/1033173712`
- Rewarded: `ca-app-pub-3940256099942544/5224354917`

**iOS Test IDs:**
- Banner: `ca-app-pub-3940256099942544/2934735716`
- Interstitial: `ca-app-pub-3940256099942544/4411468910`
- Rewarded: `ca-app-pub-3940256099942544/1712485313`

**Important**: Always use test IDs during development. Only switch to production IDs when you're ready to release!

## Visual Guide

### Finding App ID:
```
AdMob Console → Apps → [Your App] → App settings
└── App ID: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
```

### Finding Ad Unit IDs:
```
AdMob Console → Apps → [Your App] → Ad units tab
├── Banner ad unit
│   └── Ad unit ID: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
├── Interstitial ad unit
│   └── Ad unit ID: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
└── Rewarded ad unit
    └── Ad unit ID: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
```

## Quick Checklist

- [ ] Created AdMob account
- [ ] Added Android app and got Android App ID
- [ ] Added iOS app and got iOS App ID
- [ ] Created Banner ad unit for Android
- [ ] Created Banner ad unit for iOS
- [ ] Created Interstitial ad unit for Android
- [ ] Created Interstitial ad unit for iOS
- [ ] Created Rewarded ad unit for Android
- [ ] Created Rewarded ad unit for iOS
- [ ] Added App IDs to AndroidManifest.xml and Info.plist
- [ ] Updated ad mediator configuration with production Ad Unit IDs

## Troubleshooting

### "Invalid App ID" Error
- Make sure you're using the correct App ID format: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`
- Verify the App ID matches your platform (Android vs iOS)
- Check that the App ID is added to the correct file (AndroidManifest.xml for Android, Info.plist for iOS)

### "Invalid Ad Unit ID" Error
- Verify the Ad Unit ID format: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`
- Make sure you're using the correct ad unit for the correct platform
- Check that the ad unit is created and active in AdMob console

### Ads Not Showing
- Verify you're using test IDs during development
- Check that your AdMob account is approved (new accounts may take time)
- Ensure your app is properly configured with the App ID
- Check network connectivity

## Additional Resources

- [AdMob Help Center](https://support.google.com/admob)
- [AdMob Documentation](https://developers.google.com/admob)
- [React Native Google Mobile Ads](https://github.com/invertase/react-native-google-mobile-ads)

---

**Need Help?** If you're stuck, check the main setup guide: `ADMOB_MEDIATION_SETUP.md`


