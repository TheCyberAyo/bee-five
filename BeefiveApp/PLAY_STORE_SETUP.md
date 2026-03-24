# Google Play Store Setup Guide

This guide covers all the steps needed to prepare your Bee-Five app for Google Play Store submission.

## Table of Contents
1. [Release Signing](#release-signing)
2. [AAB Build Configuration](#aab-build-configuration)
3. [Data Safety Form](#data-safety-form)
4. [Privacy Policy Compliance](#privacy-policy-compliance)
5. [Play Store Listing](#play-store-listing)
6. [Building and Uploading](#building-and-uploading)

---

## Release Signing

### Step 1: Generate a Release Keystore

**IMPORTANT**: Keep your keystore file and passwords secure. If you lose them, you won't be able to update your app on the Play Store.

1. Open a terminal/command prompt
2. Navigate to the `android/app` directory
3. Run the following command (replace the values with your own):

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias beefive-release-key -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
- **Keystore password**: Choose a strong password (save it securely!)
- **Key password**: Use the same password or a different one (save it securely!)
- **Name, Organization, etc.**: Enter your details

**Example:**
```
Enter keystore password: [Your secure password]
Re-enter new password: [Your secure password]
What is your first and last name?
  [Unknown]: MindGrind
What is the name of your organizational unit?
  [Unknown]: Development
What is the name of your organization?
  [Unknown]: MindGrind
What is the name of your City or Locality?
  [Unknown]: Your City
What is the name of your State or Province?
  [Unknown]: Your State
What is the two-letter country code for this unit?
  [Unknown]: ZA
```

### Step 2: Configure Keystore Properties

1. Copy the example file:
   ```bash
   cd android
   cp keystore.properties.example keystore.properties
   ```

2. Edit `android/keystore.properties` and fill in your values:
   ```properties
   MYAPP_RELEASE_STORE_FILE=app/release.keystore
   MYAPP_RELEASE_KEY_ALIAS=beefive-release-key
   MYAPP_RELEASE_STORE_PASSWORD=your-store-password-here
   MYAPP_RELEASE_KEY_PASSWORD=your-key-password-here
   ```

3. **CRITICAL**: Add `keystore.properties` to `.gitignore`:
   ```
   android/keystore.properties
   android/app/release.keystore
   ```

### Step 3: Verify Signing Configuration

The `build.gradle` file is already configured to use the keystore. The release build will automatically use your keystore when `keystore.properties` exists.

---

## AAB Build Configuration

The app is already configured to generate Android App Bundles (AAB). This is the required format for Google Play Store.

### Build Commands

**Build AAB for release:**
```bash
cd android
./gradlew bundleRelease
```

The AAB file will be generated at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

**Build APK for testing (optional):**
```bash
cd android
./gradlew assembleRelease
```

---

## Data Safety Form

Google Play requires you to complete a Data Safety form. Here's what you need to know about Bee-Five:

### Data Collection and Sharing

Based on the current app implementation:

#### ✅ Data Collected:
- **Account Information**: Email address (if user creates account)
  - Purpose: Account creation and authentication
  - Required: No (optional account creation)
  - Data Type: Personal info

- **App Activity**: Game progress and statistics
  - Purpose: Local game functionality
  - Required: Yes (for app functionality)
  - Data Type: App activity
  - Stored: Locally on device only

#### ❌ Data NOT Collected:
- Location data
- Personal identifiers (except optional email)
- Financial information
- Contacts
- Photos or media files
- Device or other IDs (no ads currently)

#### ✅ Data Sharing:
- **Supabase**: If user creates account, email is stored in Supabase
  - Purpose: Account management and authentication
  - Data Type: Email address
  - Security: Encrypted in transit and at rest

### Data Safety Form Answers

When filling out the Data Safety form in Google Play Console:

1. **Does your app collect or share any of the required user data types?**
   - ✅ Yes (Account info, App activity)

2. **Account info (email)**
   - ✅ Collected
   - Purpose: App functionality, Account management
   - Required: No (optional)
   - Shared: Yes (with Supabase for account management)

3. **App activity (game progress)**
   - ✅ Collected
   - Purpose: App functionality
   - Required: Yes
   - Shared: No (stored locally only)

4. **Data encryption**
   - ✅ Data is encrypted in transit
   - ✅ Data is encrypted at rest (Supabase)

5. **Data deletion**
   - ✅ Users can request deletion via email (admin@mindgrind.co.za)
   - ✅ Data deletion process: Within 30 days

6. **Security practices**
   - ✅ Data is encrypted in transit
   - ✅ Users can request data deletion

### Privacy Policy URL

Your privacy policy is available at:
- In-app: Privacy Policy screen
- Online: [Your hosted privacy policy URL - update this]

**Note**: You need to host your privacy policy online and provide the URL in the Play Console.

---

## Privacy Policy Compliance

Your privacy policy is already compliant with:
- ✅ GDPR (European users)
- ✅ CCPA (California users)
- ✅ Google Play requirements
- ✅ Clear data collection disclosure
- ✅ User rights information
- ✅ Contact information for data requests

### Required Elements (Already Included):
1. ✅ What data is collected
2. ✅ How data is used
3. ✅ Third-party services (Supabase)
4. ✅ User rights (GDPR/CCPA)
5. ✅ Data security measures
6. ✅ Contact information
7. ✅ Children's privacy policy
8. ✅ Data retention policy

### Next Steps:
1. Host your privacy policy online (Netlify, GitHub Pages, etc.)
2. Update the URL in Play Console
3. Ensure the URL is accessible without authentication

---

## Play Store Listing

### Required Assets

Prepare these assets for your Play Store listing:

#### 1. App Icon
- **Size**: 512 x 512 pixels
- **Format**: PNG (32-bit with alpha channel)
- **Location**: Already in `android/app/src/main/res/mipmap-*/ic_launcher.png`

#### 2. Feature Graphic
- **Size**: 1024 x 500 pixels
- **Format**: PNG or JPG
- **Purpose**: Banner shown at the top of your app's listing

#### 3. Screenshots
- **Phone**: At least 2 screenshots (max 8)
  - **Size**: 16:9 or 9:16 aspect ratio
  - **Minimum**: 320px (shortest side)
  - **Maximum**: 3840px (longest side)
- **Tablet** (optional): Same requirements

#### 4. Promotional Video (Optional)
- **Format**: YouTube URL
- **Length**: 30 seconds to 2 minutes

### App Information

#### Short Description
- **Max length**: 80 characters
- **Example**: "Strategic bee-themed board game with AI opponents and adventure mode"

#### Full Description
- **Max length**: 4000 characters
- Include:
  - App features
  - Gameplay description
  - Key highlights
  - What makes it unique

**Example Template:**
```
Bee-Five is a strategic board game where you control bees in an exciting tactical challenge.

🎮 GAME MODES:
• AI Game - Challenge intelligent opponents
• Adventure Mode - Progress through levels
• Local Multiplayer - Play with friends

✨ FEATURES:
• Beautiful bee-themed design
• Multiple difficulty levels
• Progress tracking
• Smooth gameplay

Perfect for strategy game lovers!
```

#### Category
- **Primary**: Games > Board
- **Secondary** (optional): Games > Strategy

#### Content Rating
- Complete the content rating questionnaire
- Likely **content** rating: **Everyone** (no violence, no inappropriate content)—confirm in the questionnaire

#### Target Audience
- **Age**: **13+** (match your privacy policy and Play Console target audience settings)
- **Content**: Family-friendly

---

## Building and Uploading

### Step 1: Build the AAB

```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

### Step 2: Locate the AAB

The AAB file will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### Step 3: Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app (or create a new one)
3. Go to **Production** (or **Testing** for internal testing)
4. Click **Create new release**
5. Upload the AAB file
6. Fill in release notes
7. Review and roll out

### Step 4: Complete Store Listing

1. Fill in all required fields:
   - App name
   - Short description
   - Full description
   - Graphics (icon, screenshots, feature graphic)
   - Category
   - Content rating

### Step 5: Complete Data Safety Form

1. Go to **Policy** → **Data safety**
2. Answer all questions based on the information above
3. Provide privacy policy URL
4. Submit for review

### Step 6: Submit for Review

1. Ensure all sections are complete:
   - ✅ Store listing
   - ✅ Data safety
   - ✅ Content rating
   - ✅ App content
   - ✅ Pricing & distribution
2. Click **Submit for review**

---

## Checklist

Before submitting, ensure:

- [ ] Release keystore generated and configured
- [ ] `keystore.properties` created (not committed to git)
- [ ] AAB built successfully
- [ ] Privacy policy hosted online
- [ ] Privacy policy URL added to Play Console
- [ ] Data Safety form completed
- [ ] Store listing complete (all required fields)
- [ ] Screenshots uploaded
- [ ] App icon uploaded
- [ ] Feature graphic uploaded
- [ ] Content rating completed
- [ ] All app information filled in
- [ ] Release notes written
- [ ] App tested thoroughly

---

## Troubleshooting

### Build Fails: "Keystore file not found"
- Ensure `keystore.properties` exists in `android/` directory
- Check that the path in `MYAPP_RELEASE_STORE_FILE` is correct
- Verify the keystore file exists at the specified path

### Build Fails: "Signing config not found"
- Ensure `keystore.properties` has all required properties
- Check that passwords are correct

### AAB Too Large
- The AAB format automatically splits by architecture
- Google Play will generate optimized APKs for each device
- Consider enabling ProGuard if size is still an issue

### Data Safety Form Rejected
- Review your privacy policy matches the form answers
- Ensure all data collection is accurately disclosed
- Update privacy policy if needed

---

## Additional Resources

- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Android App Bundle Guide](https://developer.android.com/guide/app-bundle)
- [Data Safety Requirements](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Privacy Policy Requirements](https://support.google.com/googleplay/android-developer/answer/9898170)

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Google Play Console help documentation
3. Contact: admin@mindgrind.co.za

Good luck with your Play Store submission! 🚀



















