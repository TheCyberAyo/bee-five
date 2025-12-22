# Quick Start: Google Play Store Submission

This is a quick reference guide for submitting Bee-Five to the Google Play Store.

## 🚀 Quick Steps

### 1. Generate Release Keystore (One-time setup)

**Windows:**
```bash
cd android/app
generate-keystore.bat
```

**Mac/Linux:**
```bash
cd android/app
chmod +x generate-keystore.sh
./generate-keystore.sh
```

Then create `android/keystore.properties` with your keystore details.

### 2. Build AAB

**Windows:**
```bash
cd android
build-aab.bat
```

**Mac/Linux:**
```bash
cd android
chmod +x build-aab.sh
./build-aab.sh
```

AAB file location: `android/app/build/outputs/bundle/release/app-release.aab`

### 3. Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create app or select existing
3. Go to **Production** → **Create new release**
4. Upload the AAB file
5. Add release notes
6. Review and roll out

### 4. Complete Store Listing

Follow `PLAY_STORE_LISTING_GUIDE.md` for:
- App description
- Screenshots
- Graphics
- Category selection

### 5. Complete Data Safety Form

Follow `DATA_SAFETY_GUIDE.md` for:
- Data collection answers
- Privacy policy URL
- Security practices

### 6. Submit for Review

Ensure all sections are complete:
- ✅ Store listing
- ✅ Data safety
- ✅ Content rating
- ✅ Privacy policy
- ✅ App content

---

## 📋 Detailed Guides

- **Complete Setup**: `PLAY_STORE_SETUP.md`
- **Data Safety Form**: `DATA_SAFETY_GUIDE.md`
- **Store Listing**: `PLAY_STORE_LISTING_GUIDE.md`

---

## ✅ Pre-Submission Checklist

- [ ] Release keystore generated
- [ ] `keystore.properties` created (not in git)
- [ ] AAB built successfully
- [ ] Privacy policy hosted online
- [ ] Privacy policy URL ready
- [ ] Store listing complete
- [ ] Screenshots prepared
- [ ] App icon ready (512x512)
- [ ] Feature graphic ready (1024x500)
- [ ] Data Safety form answers prepared
- [ ] Content rating completed
- [ ] App tested thoroughly

---

## 🆘 Need Help?

- Check `PLAY_STORE_SETUP.md` for detailed instructions
- Review Google Play Console help documentation
- Contact: admin@mindgrind.co.za

Good luck! 🎉



















