# 🎉 AdMob Account Approved - Next Steps

Congratulations! Your AdMob account has been approved. Follow these steps to configure your app for production ads.

## ❓ Do I Need My App in the Stores First?

**No!** You do **NOT** need to have your app published in the Google Play Store or Apple App Store yet. You can:

✅ Create your app in AdMob console before publishing  
✅ Get your App IDs and Ad Unit IDs before publishing  
✅ Configure everything in your code now  
✅ Test with production IDs in release builds locally  

**Recommended Approach:**

1. **Now (Before Publishing):**
   - Get your production IDs from AdMob
   - Add them to your code configuration
   - Keep using test mode (`testMode: __DEV__`) for development
   - Test with production IDs in local release builds

2. **When Ready to Publish:**
   - The production IDs are already configured
   - Switch to production mode (`testMode: false`) in your release builds
   - Submit to stores with everything ready

3. **After Publishing:**
   - Monitor your AdMob console
   - Ads will start serving automatically once your app is live

## Step 1: Get Your Production IDs from AdMob

### 1.1 Get Your App IDs

1. Go to [AdMob Console](https://admob.google.com/)
2. Click **Apps** in the left sidebar
3. For each platform (Android and iOS):
   - Click on your app
   - Go to **App settings**
   - Copy your **App ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`)
   - **Save these IDs somewhere safe** - you'll need them in the next steps

### 1.2 Get Your Ad Unit IDs

1. In AdMob Console, go to **Apps** → Select your app
2. Click the **Ad units** tab
3. Create ad units if you haven't already (you need separate ones for Android and iOS):
   - Click **Add ad unit**
   - Select ad format: **Banner**, **Interstitial**, or **Rewarded**
   - Enter a name (e.g., "Banner - Android")
   - Click **Create ad unit**
   - Copy the **Ad Unit ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`)

**Create these ad units:**
- ✅ Banner (Android)
- ✅ Banner (iOS)
- ✅ Interstitial (Android)
- ✅ Interstitial (iOS)
- ✅ Rewarded (Android)
- ✅ Rewarded (iOS)

## Step 2: Add App IDs to Native Files

### 2.1 Update Android App ID

1. Open `BeefiveApp/android/app/src/main/AndroidManifest.xml`
2. Find the `<meta-data>` tag with `com.google.android.gms.ads.APPLICATION_ID`
3. Replace the test App ID with your production Android App ID

**Current (test ID):**
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-3940256099942544~3347511713"
    tools:replace="android:value"/>
```

**Update to your production App ID:**
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
    tools:replace="android:value"/>
```
*(Replace `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX` with your actual Android App ID)*

### 2.2 Update iOS App ID

1. Open `BeefiveApp/ios/BeefiveApp/Info.plist`
2. Add the AdMob App ID (if not already present) before the closing `</dict>` tag

**Add this:**
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX</string>
```
*(Replace `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX` with your actual iOS App ID)*

## Step 3: Update Ad Mediator Configuration

Now you need to configure your production ad unit IDs in your app code.

### Option A: Update in App.tsx (Recommended)

1. Open `BeefiveApp/App.tsx`
2. Update the `initializeAdMediator` call with your production ad unit IDs:

```typescript
import { initializeAdMediator } from './src/services/adMediator';
import { Platform } from 'react-native';

// Initialize Ad Mediator on app start
useEffect(() => {
  initializeAdMediator({
    testMode: false, // Set to false for production
    adUnits: {
      banner: {
        adType: 'banner',
        testUnitId: 'ca-app-pub-3940256099942544/6300978111', // Keep for fallback
        productionUnitId: Platform.OS === 'ios' 
          ? 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' // Your iOS Banner ID
          : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Your Android Banner ID
        position: 'bottom',
        size: 'banner',
      },
      interstitial: {
        adType: 'interstitial',
        testUnitId: 'ca-app-pub-3940256099942544/1033173712',
        productionUnitId: Platform.OS === 'ios'
          ? 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' // Your iOS Interstitial ID
          : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Your Android Interstitial ID
      },
      rewarded: {
        adType: 'rewarded',
        testUnitId: 'ca-app-pub-3940256099942544/5224354917',
        productionUnitId: Platform.OS === 'ios'
          ? 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' // Your iOS Rewarded ID
          : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // Your Android Rewarded ID
      },
    },
    performanceTrackingEnabled: true,
    autoOptimizeEnabled: true,
  }).catch((error) => {
    console.error('Failed to initialize ad mediator:', error);
  });
}, []);
```

### Option B: Use Environment Variables (Better for Production)

Create a `.env` file in `BeefiveApp/` directory:

```env
# AdMob Configuration
ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
ADMOB_IOS_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
ADMOB_ANDROID_REWARDED_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
ADMOB_IOS_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
ADMOB_IOS_REWARDED_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
```

Then update `App.tsx` to use these variables.

## Step 4: Set Up Privacy Policy (REQUIRED)

AdMob requires a privacy policy. If you haven't created one yet:

1. **Create a Privacy Policy** that includes:
   - What data you collect
   - How you use data
   - Third-party services (AdMob, Google)
   - User rights (GDPR, CCPA compliance)
   - Contact information

2. **Host it online** (free options):
   - GitHub Pages
   - Netlify
   - Vercel
   - Google Sites

3. **Add Privacy Policy URL to AdMob**:
   - Go to AdMob Console → Apps → [Your App] → App settings
   - Scroll to "Privacy Policy URL"
   - Add your privacy policy URL

4. **Add Privacy Policy link in your app**:
   - Create a Privacy Policy screen/component
   - Link to your hosted privacy policy
   - Make it accessible from settings or main menu

## Step 5: Test Your Production Setup

### 5.1 Test with Test Mode First

Before going fully live, test that everything works:

1. Keep `testMode: __DEV__` in your code temporarily
2. Run your app in development mode
3. Verify ads load correctly
4. Check that the ad mediator initializes without errors

### 5.2 Gradually Switch to Production

1. **For Development Builds**: Keep using test IDs (`testMode: true`)
2. **For Release Builds**: Use production IDs (`testMode: false`)

You can make this automatic based on build type:

```typescript
initializeAdMediator({
  testMode: __DEV__, // Automatically uses test IDs in dev, production IDs in release
  // ... rest of config
})
```

The ad mediator already handles this - when `testMode: false`, it uses `productionUnitId`; when `testMode: true`, it uses `testUnitId`.

## Step 6: Build and Test Release Version

### For Android:

1. Create a release build:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. Install on a device:
   ```bash
   adb install app/build/outputs/apk/release/app-release.apk
   ```

3. Test that production ads load correctly

### For iOS:

1. Open Xcode
2. Select your target
3. Change build configuration to "Release"
4. Archive and build
5. Test on a device

## Step 7: Monitor Your Ads

Once live:

1. **Check AdMob Console**:
   - Go to AdMob → Apps → [Your App]
   - Monitor impressions, clicks, revenue
   - Check for any policy warnings

2. **Watch for Issues**:
   - Ad loading failures
   - Invalid traffic warnings
   - Policy violations

## Step 8: Set Up Mediation (Optional but Recommended)

To maximize revenue, set up ad mediation:

1. In AdMob Console, go to **Mediation** → **Mediation groups**
2. Create mediation groups for each ad format
3. Add ad networks (Facebook, AppLovin, Unity, etc.)
4. Configure waterfall order based on performance

See `ADMOB_MEDIATION_SETUP.md` for detailed instructions.

## Quick Checklist

- [ ] Got Android App ID from AdMob
- [ ] Got iOS App ID from AdMob
- [ ] Created all ad units (Banner, Interstitial, Rewarded) for both platforms
- [ ] Got all 6 Ad Unit IDs (3 for Android, 3 for iOS)
- [ ] Updated Android App ID in `AndroidManifest.xml`
- [ ] Updated iOS App ID in `Info.plist`
- [ ] Updated ad mediator configuration with production ad unit IDs
- [ ] Created and hosted privacy policy
- [ ] Added privacy policy URL to AdMob
- [ ] Tested release build with production IDs
- [ ] Set up mediation (optional)

## Important Notes

⚠️ **DO NOT** click your own ads - this violates AdMob policy and can get your account banned!

⚠️ **DO NOT** use production ad unit IDs in development - always test with test IDs first

⚠️ **DO** keep test IDs as fallback in case production IDs fail

⚠️ **DO** monitor your AdMob console regularly for issues

## Need Help?

- Check `HOW_TO_GET_ADMOB_IDS.md` for detailed ID setup
- Check `ADMOB_MEDIATION_SETUP.md` for mediation setup
- Check `APP_APPROVAL_CHECKLIST.md` for complete approval guide

## Next Steps After Setup

1. ✅ AdMob configured
2. ⏭️ Set up Google Play Store listing (if Android)
3. ⏭️ Set up Apple App Store listing (if iOS)
4. ⏭️ Submit your app for review

Good luck! 🚀

