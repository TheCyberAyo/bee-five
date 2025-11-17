# AdMob Mediation Setup Guide

This guide explains how to configure ad mediation in your AdMob console after the native setup is complete.

## ✅ What's Already Done

- ✅ `react-native-google-mobile-ads` package installed
- ✅ Android `build.gradle` configured with mediation adapters
- ✅ Android `MainApplication.kt` initialized Mobile Ads SDK
- ✅ iOS `Podfile` configured with mediation adapters
- ✅ iOS `AppDelegate.swift` initialized Mobile Ads SDK

## 📋 Next Steps: AdMob Console Configuration

### 1. Create Your AdMob Account

1. Go to [Google AdMob](https://admob.google.com/)
2. Sign in with your Google account
3. Create a new app (or add your existing app)
4. Note your **App ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`)

### 2. Add Your App ID to Your App

#### Android: Update `AndroidManifest.xml`

Add your AdMob App ID to `BeefiveApp/android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <application>
        <!-- Add this meta-data tag inside <application> -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"/>
    </application>
</manifest>
```

#### iOS: Update `Info.plist`

Add your AdMob App ID to `BeefiveApp/ios/BeefiveApp/Info.plist`:

```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX</string>
```

### 3. Create Ad Units

In AdMob console, create ad units for each ad format you want to use:

- **Banner Ads**: For displaying ads at the top/bottom of screens
- **Interstitial Ads**: Full-screen ads between game levels/screens
- **Rewarded Ads**: Ads that reward users (e.g., extra lives, coins)
- **Native Ads**: Customizable ads that match your app's design

**Important**: Create separate ad units for Android and iOS.

### 4. Set Up Mediation Groups

1. In AdMob console, go to **Mediation** → **Mediation groups**
2. Click **Create mediation group**
3. Select your ad format (Banner, Interstitial, Rewarded, etc.)
4. Choose your ad unit
5. Select **Platform** (Android or iOS)

### 5. Add Ad Networks to Mediation

For each mediation group, add the ad networks you want to use:

#### Recommended Networks (Already Configured in Code):

1. **Meta Audience Network (Facebook)**
   - High fill rates, good eCPM
   - Requires Facebook App ID setup

2. **AppLovin MAX**
   - Excellent performance
   - Requires AppLovin SDK key

3. **Unity Ads**
   - Great for gaming apps
   - Requires Unity Game ID

4. **AdColony**
   - Good video ad performance
   - Requires AdColony App ID

5. **Vungle**
   - Strong video ad network
   - Requires Vungle App ID

6. **IronSource**
   - High-quality demand
   - Requires IronSource App Key

7. **Chartboost**
   - Gaming-focused network
   - Requires Chartboost App ID

8. **InMobi**
   - Strong international presence
   - Requires InMobi Account ID

### 6. Configure Network Settings

For each network you add:

1. **Set up network accounts**: Sign up with each network and get their credentials
2. **Add credentials in AdMob**: Enter App IDs, SDK keys, etc. in the mediation group
3. **Set eCPM floors**: Configure minimum eCPM for each network
4. **Set waterfall order**: Arrange networks by priority (highest eCPM first)

### 7. Network-Specific Setup Requirements

Some networks require additional setup:

#### Meta Audience Network (Facebook)
- Create a Facebook App at [developers.facebook.com](https://developers.facebook.com/)
- Get your Facebook App ID
- Add to AndroidManifest.xml and Info.plist

#### AppLovin MAX
- Sign up at [applovin.com](https://www.applovin.com/)
- Get your SDK Key
- Configure in AdMob mediation settings

#### Unity Ads
- Sign up at [unity.com/ads](https://unity.com/ads)
- Get your Game ID
- Configure in AdMob mediation settings

### 8. Test Your Setup

#### Use Test Ad Unit IDs During Development

**Android Test IDs:**
- Banner: `ca-app-pub-3940256099942544/6300978111`
- Interstitial: `ca-app-pub-3940256099942544/1033173712`
- Rewarded: `ca-app-pub-3940256099942544/5224354917`

**iOS Test IDs:**
- Banner: `ca-app-pub-3940256099942544/2934735716`
- Interstitial: `ca-app-pub-3940256099942544/4411468910`
- Rewarded: `ca-app-pub-3940256099942544/1712485313`

**Important**: Always use test IDs during development to avoid policy violations.

### 9. Using Ads in Your React Native Code

Example implementation:

```typescript
import mobileAds from 'react-native-google-mobile-ads';

// Initialize (usually in App.tsx or index.js)
mobileAds()
  .initialize()
  .then(adapterStatuses => {
    // Initialization complete
  });

// Banner Ad Component
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

<BannerAd
  unitId={__DEV__ ? TestIds.BANNER : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'}
  size={BannerAdSize.FULL_BANNER}
  requestOptions={{
    requestNonPersonalizedAdsOnly: true,
  }}
/>

// Interstitial Ad
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

const interstitial = InterstitialAd.createForAdRequest(
  __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'
);

// Rewarded Ad
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

const rewarded = RewardedAd.createForAdRequest(
  __DEV__ ? TestIds.REWARDED : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'
);
```

## 🔧 Managing Mediation Adapters

### Adding New Networks

1. Add the adapter dependency to `android/app/build.gradle`:
   ```gradle
   implementation 'com.google.ads.mediation:network-name:version'
   ```

2. Add the pod to `ios/Podfile`:
   ```ruby
   pod 'GoogleMobileAdsMediationNetworkName', '~> version'
   ```

3. Run `cd ios && pod install` (for iOS)
4. Rebuild your app
5. Add the network in AdMob console mediation groups

### Removing Networks

1. Remove from `build.gradle` and `Podfile`
2. Remove from AdMob mediation groups
3. Rebuild your app

### Updating Adapter Versions

Check the [Google AdMob Mediation Documentation](https://developers.google.com/admob/android/mediation) for the latest adapter versions and update them in your build files.

## 📊 Monitoring Performance

1. **AdMob Console**: Monitor fill rates, eCPM, revenue by network
2. **Mediation Reports**: See which networks are performing best
3. **Optimize Waterfall**: Adjust network order based on performance data

## ⚠️ Important Notes

1. **Privacy Compliance**: Ensure you comply with GDPR, CCPA, and other privacy regulations
2. **User Experience**: Don't over-saturate your app with ads
3. **Testing**: Always test with test ad IDs before using production IDs
4. **Policy Compliance**: Follow AdMob policies and each network's policies
5. **Performance**: Monitor app performance - too many adapters can increase app size

## 🔗 Useful Resources

- [Google AdMob Documentation](https://developers.google.com/admob)
- [React Native Google Mobile Ads](https://github.com/invertase/react-native-google-mobile-ads)
- [AdMob Mediation Guide](https://developers.google.com/admob/android/mediation)
- [AdMob Policy Center](https://support.google.com/admob/answer/6128543)

## 📝 Checklist

- [ ] AdMob account created
- [ ] App created in AdMob console
- [ ] App ID added to AndroidManifest.xml
- [ ] App ID added to Info.plist
- [ ] Ad units created (Banner, Interstitial, Rewarded)
- [ ] Mediation groups created for each ad format
- [ ] Ad networks added to mediation groups
- [ ] Network credentials configured
- [ ] Test ads working in development
- [ ] Production ad units ready for release

---

**Note**: You can set up the native configuration now, but you'll need to complete the AdMob console setup before ads will actually display. The native setup is ready to go!



