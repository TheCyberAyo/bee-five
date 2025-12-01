# App Approval Checklist

This guide covers everything you need to do to get your Bee-Five app approved for:
1. **AdMob** (for ad monetization)
2. **Google Play Store** (Android)
3. **Apple App Store** (iOS)

## Part 1: AdMob Approval Requirements

### ✅ Required Steps for AdMob Approval

#### 1. Complete AdMob Account Setup
- [ ] Create AdMob account at [admob.google.com](https://admob.google.com/)
- [ ] Verify your email address
- [ ] Complete payment profile (add payment method for receiving ad revenue)
- [ ] Add tax information (required for payments)

#### 2. Create Your App in AdMob
- [ ] Add Android app to AdMob console
  - Package name: `com.beefive` (verify in `android/app/build.gradle`)
  - App name: "Bee-Five"
- [ ] Add iOS app to AdMob console
  - Bundle ID: Check your Xcode project settings
  - App name: "Bee-Five"
- [ ] Get App IDs for both platforms
- [ ] Add App IDs to your app (see `HOW_TO_GET_ADMOB_IDS.md`)

#### 3. Create Ad Units
- [ ] Create Banner ad unit (Android)
- [ ] Create Banner ad unit (iOS)
- [ ] Create Interstitial ad unit (Android)
- [ ] Create Interstitial ad unit (iOS)
- [ ] Create Rewarded ad unit (Android)
- [ ] Create Rewarded ad unit (iOS)

#### 4. Privacy Policy (REQUIRED)
AdMob **requires** a publicly accessible privacy policy URL. You need:

- [ ] **Create a Privacy Policy** that includes:
  - What data you collect
  - How you use data
  - Third-party services (AdMob, Google)
  - User rights (GDPR, CCPA compliance)
  - Contact information

- [ ] **Host it online** (free options):
  - GitHub Pages
  - Netlify
  - Vercel
  - Your own website
  - Google Sites

- [ ] **Add Privacy Policy URL to AdMob**:
  - Go to AdMob → Apps → [Your App] → App settings
  - Add Privacy Policy URL

- [ ] **Add Privacy Policy link in your app**:
  - Add a "Privacy Policy" button/screen in your app
  - Link to your hosted privacy policy

#### 5. Test Your Ads
- [ ] Use test ad unit IDs during development
- [ ] Verify ads display correctly
- [ ] Test on both Android and iOS
- [ ] Ensure ads don't break app functionality

#### 6. AdMob Policy Compliance
- [ ] No click fraud (don't click your own ads)
- [ ] No invalid traffic
- [ ] Ads must be clearly distinguishable from content
- [ ] No misleading ad placement
- [ ] Follow [AdMob Policies](https://support.google.com/admob/answer/6128543)

### ⏱️ AdMob Approval Timeline
- **Account review**: 1-3 days
- **App review**: 1-7 days (after you submit)
- **First payment**: Usually 21 days after first ad impression

---

## Part 2: Google Play Store Approval

### ✅ Required Steps for Play Store

#### 1. Developer Account Setup
- [ ] Create Google Play Console account ($25 one-time fee)
- [ ] Complete developer profile
- [ ] Accept Developer Distribution Agreement

#### 2. App Information
- [ ] App name: "Bee-Five"
- [ ] Short description (80 characters max)
- [ ] Full description (4000 characters max)
- [ ] App icon (512x512 PNG, no transparency)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (at least 2, up to 8)
  - Phone screenshots (16:9 or 9:16)
  - Tablet screenshots (optional)
- [ ] Promotional video (optional, YouTube)

#### 3. Content Rating
- [ ] Complete content rating questionnaire
- [ ] Get rating (likely "Everyone" for a puzzle game)

#### 4. Privacy & Security
- [ ] **Privacy Policy URL** (same as AdMob)
- [ ] Data safety section:
  - What data you collect
  - How data is used
  - Data sharing practices
- [ ] Target audience (age group)

#### 5. App Signing
- [ ] Generate upload keystore (if not done)
- [ ] Sign your app with release keystore
- [ ] Enable Play App Signing (recommended)

#### 6. Build & Release
- [ ] Build release APK/AAB:
  ```bash
  cd android
  ./gradlew bundleRelease  # For AAB (recommended)
  # or
  ./gradlew assembleRelease  # For APK
  ```
- [ ] Test release build thoroughly
- [ ] Upload to Play Console
- [ ] Create release (internal testing → closed testing → production)

#### 7. Store Listing Requirements
- [ ] App category: Games → Puzzle
- [ ] Tags/keywords
- [ ] Contact email
- [ ] Website (optional)
- [ ] Support URL (optional)

#### 8. Required Permissions
Review your `AndroidManifest.xml`:
- [ ] Only request necessary permissions
- [ ] Add permission explanations if needed
- [ ] Remove unused permissions

#### 9. Testing
- [ ] Test on multiple Android devices
- [ ] Test different screen sizes
- [ ] Test on different Android versions
- [ ] No crashes or major bugs

### ⏱️ Play Store Review Timeline
- **First review**: 1-7 days
- **Updates**: Usually 1-3 days

---

## Part 3: Apple App Store Approval

### ✅ Required Steps for App Store

#### 1. Developer Account Setup
- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Complete enrollment process
- [ ] Wait for approval (can take 24-48 hours)

#### 2. App Information
- [ ] App name: "Bee-Five"
- [ ] Subtitle (30 characters)
- [ ] Description (4000 characters)
- [ ] Keywords (100 characters, comma-separated)
- [ ] App icon (1024x1024 PNG, no transparency)
- [ ] Screenshots:
  - iPhone (6.7", 6.5", 5.5")
  - iPad (12.9", 11")
- [ ] App preview video (optional)

#### 3. Privacy Policy (REQUIRED)
- [ ] Same privacy policy URL as AdMob
- [ ] Add to App Store Connect
- [ ] Link in app

#### 4. App Privacy Details
In App Store Connect, declare:
- [ ] Data collection practices
- [ ] Data usage
- [ ] Data sharing
- [ ] Tracking (if any)

#### 5. Age Rating
- [ ] Complete age rating questionnaire
- [ ] Get rating certificate

#### 6. Build & Archive
- [ ] Configure Xcode project:
  - Bundle identifier
  - Version number
  - Build number
- [ ] Archive your app in Xcode:
  ```
  Product → Archive
  ```
- [ ] Upload to App Store Connect
- [ ] Wait for processing (10-30 minutes)

#### 7. App Store Connect Setup
- [ ] Create app record in App Store Connect
- [ ] Configure app information
- [ ] Upload screenshots and metadata
- [ ] Set pricing and availability
- [ ] Submit for review

#### 8. Required Info.plist Entries
Check `ios/BeefiveApp/Info.plist`:
- [ ] Add AdMob App ID:
  ```xml
  <key>GADApplicationIdentifier</key>
  <string>ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX</string>
  ```
- [ ] Add privacy usage descriptions if using:
  - Camera
  - Location
  - Photo library
  - etc.

#### 9. Testing
- [ ] Test on multiple iOS devices
- [ ] Test on different iOS versions
- [ ] Test on iPhone and iPad
- [ ] No crashes or major bugs
- [ ] TestFlight beta testing (recommended)

### ⏱️ App Store Review Timeline
- **First review**: 1-3 days (can be longer)
- **Updates**: Usually 1-2 days

---

## Part 4: App Configuration Checklist

### ✅ Code Changes Needed

#### 1. Privacy Policy Screen
- [ ] Add Privacy Policy screen/component to your app
- [ ] Link to your hosted privacy policy
- [ ] Make it accessible from main menu/settings

#### 2. App Metadata
- [ ] Update `app.json`:
  ```json
  {
    "name": "BeefiveApp",
    "displayName": "Bee-Five",
    "version": "1.0.0"
  }
  ```

#### 3. Version Numbers
- [ ] Android: Update in `android/app/build.gradle`
  ```gradle
  versionCode 1
  versionName "1.0.0"
  ```
- [ ] iOS: Update in Xcode project settings

#### 4. App Icons
- [ ] Create app icon (1024x1024 for iOS, various sizes for Android)
- [ ] Add to `android/app/src/main/res/` (various mipmap folders)
- [ ] Add to iOS project (Assets.xcassets)

#### 5. Splash Screen
- [ ] Create launch screen/splash screen
- [ ] Configure for Android and iOS

#### 6. Remove Test/Debug Code
- [ ] Remove console.logs (or use proper logging)
- [ ] Remove test data
- [ ] Remove debug flags
- [ ] Ensure production ad unit IDs are used (not test IDs)

#### 7. Error Handling
- [ ] Add proper error handling
- [ ] Handle network failures gracefully
- [ ] Handle ad loading failures
- [ ] Add user-friendly error messages

---

## Part 5: Privacy Policy Template

You need a privacy policy. Here's what to include:

### Privacy Policy Requirements:

1. **Introduction**
   - Who you are
   - What the app is
   - Contact information

2. **Data Collection**
   - What data you collect (if any)
   - How data is collected
   - Purpose of collection

3. **Third-Party Services**
   - AdMob/Google Ads
   - Analytics (if any)
   - Other SDKs

4. **Data Usage**
   - How you use collected data
   - Data retention

5. **User Rights**
   - GDPR rights (EU users)
   - CCPA rights (California users)
   - How to request data deletion

6. **Children's Privacy**
   - COPPA compliance if targeting children

7. **Changes to Policy**
   - How users will be notified

### Quick Privacy Policy Generator:
- [Privacy Policy Generator](https://www.freeprivacypolicy.com/)
- [Termly Privacy Policy Generator](https://termly.io/products/privacy-policy-generator/)

---

## Part 6: Testing Before Submission

### ✅ Pre-Submission Testing

#### Functional Testing
- [ ] All game modes work correctly
- [ ] Ads display without breaking gameplay
- [ ] No crashes during normal use
- [ ] App works offline (if applicable)
- [ ] Save/load functionality works
- [ ] Settings persist correctly

#### Performance Testing
- [ ] App loads quickly
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] Ads don't cause lag

#### Device Testing
- [ ] Test on multiple devices
- [ ] Test on different screen sizes
- [ ] Test on different OS versions
- [ ] Test in both portrait and landscape (if supported)

#### Ad Testing
- [ ] Test with test ad IDs
- [ ] Verify ads don't overlap content
- [ ] Test interstitial ad timing
- [ ] Test rewarded ad flow
- [ ] Verify ad revenue tracking

---

## Part 7: Submission Process

### Google Play Store Submission:
1. [ ] Complete all store listing information
2. [ ] Upload release build (AAB recommended)
3. [ ] Fill out content rating
4. [ ] Complete data safety form
5. [ ] Submit for review
6. [ ] Wait for approval
7. [ ] Release to production

### Apple App Store Submission:
1. [ ] Complete App Store Connect information
2. [ ] Upload build via Xcode
3. [ ] Complete app privacy details
4. [ ] Submit for review
5. [ ] Wait for approval
6. [ ] Release to App Store

---

## Common Rejection Reasons

### AdMob:
- ❌ Missing privacy policy
- ❌ Invalid traffic/click fraud
- ❌ Misleading ad placement
- ❌ Policy violations

### Google Play:
- ❌ Missing privacy policy
- ❌ Incomplete store listing
- ❌ App crashes
- ❌ Policy violations
- ❌ Incomplete data safety form

### Apple App Store:
- ❌ Missing privacy policy
- ❌ Incomplete app information
- ❌ App crashes
- ❌ Guideline violations
- ❌ Missing required permissions descriptions

---

## Quick Start Checklist

**Before you can submit, you MUST have:**

1. ✅ Privacy Policy hosted online with public URL
2. ✅ Privacy Policy link in your app
3. ✅ AdMob account created and app added
4. ✅ Ad units created in AdMob
5. ✅ App IDs added to AndroidManifest.xml and Info.plist
6. ✅ Production ad unit IDs configured
7. ✅ App tested thoroughly
8. ✅ Release build created
9. ✅ Developer accounts (Play Console $25, App Store $99/year)

---

## Resources

- [AdMob Policy Center](https://support.google.com/admob/answer/6128543)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Privacy Policy Generator](https://www.freeprivacypolicy.com/)

---

**Next Steps:**
1. Start with creating your privacy policy
2. Set up AdMob account and get your IDs
3. Test your app thoroughly
4. Prepare store listings
5. Submit for review

Good luck with your app approval! 🐝


