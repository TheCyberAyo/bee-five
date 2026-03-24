# Google Play Data Safety Form - Complete Guide

This document provides detailed answers for completing the Google Play Data Safety form for Bee-Five.

## Overview

Bee-Five collects minimal data and is designed with privacy in mind. This guide will help you accurately complete the Data Safety form in Google Play Console.

---

## Step-by-Step Form Completion

### Section 1: Data Collection Overview

**Question**: "Does your app collect or share any of the required user data types?"

**Answer**: ✅ **Yes**

**Reason**: The app collects:
- Account information (email) - if user creates account
- App activity (game progress) - for local functionality
- Device or advertising identifiers - **via Google AdMob** for advertising and measurement (see Section 2.3)

---

## Section 2: Data Types Collected

### 2.1 Account Information

**Is this data type collected?** ✅ **Yes**

**Data Collected**:
- Email address (optional - only if user creates account)

**Purpose**:
- ✅ App functionality
- ✅ Account management
- ✅ Authentication

**Is this data required for your app to function?** ❌ **No** (account creation is optional)

**Is this data shared with third parties?** ✅ **Yes**

**Third Parties**:
- **Supabase**: For account management and authentication
  - Purpose: Backend services, user authentication
  - Data type: Email address
  - Security: Encrypted in transit and at rest

**Is this data encrypted in transit?** ✅ **Yes**

**Is this data encrypted at rest?** ✅ **Yes** (Supabase encrypts data at rest)

**Data retention**: Until user requests deletion (within 30 days)

---

### 2.2 App Activity

**Is this data type collected?** ✅ **Yes**

**Data Collected**:
- Game progress
- Game statistics
- Local gameplay data

**Purpose**:
- ✅ App functionality (required for game to work)

**Is this data required for your app to function?** ✅ **Yes**

**Is this data shared with third parties?** ❌ **No**

**Where is this data stored?** 
- ✅ On device only (local storage)

**Is this data encrypted in transit?** ❌ **N/A** (stored locally only)

**Is this data encrypted at rest?** ✅ **Yes** (device encryption)

**Data retention**: Until user uninstalls app or clears app data

---

### 2.3 Device or other IDs (Advertising via Google AdMob)

**Is this data type collected?** ✅ **Yes**

**Data collected / processed**:
- Advertising ID (where available), or similar identifiers used to serve and measure ads

**Purpose**:
- ✅ Advertising or marketing
- ✅ Analytics (ad performance)

**Is this data required for your app to function?** ❌ **No** (core gameplay does not require ads)

**Is this data shared with third parties?** ✅ **Yes**

**Third parties**:
- **Google (AdMob)**: Serves ads and may use identifiers for personalization and fraud prevention. See [Google's Privacy Policy](https://policies.google.com/privacy).

**Is this data encrypted in transit?** ✅ **Yes** (HTTPS/TLS to Google services)

**Data retention**: Governed by Google's policies; users can limit ad personalization via device and Google account settings where available.

---

## Section 3: Data NOT Collected

The following data types are **NOT** collected **directly by Bee-Five** (outside of what third-party SDKs process as described in Section 2.3):

- ❌ Location
- ❌ Personal identifiers (except optional email)
- ❌ Financial information
- ❌ Contacts
- ❌ Photos or media files
- ❌ Health information
- ❌ Messages
- ❌ Files and docs
- ❌ Calendar
- ❌ Call logs

---

## Section 4: Data Security

### Security Practices

**Does your app encrypt data in transit?** ✅ **Yes**
- All network communication uses HTTPS/TLS encryption
- Supabase connection is encrypted
- Connections to Google (AdMob) use HTTPS

**Does your app encrypt data at rest?** ✅ **Yes**
- Local data: Device encryption
- Server data: Supabase encryption

**Can users request data deletion?** ✅ **Yes**
- Users can request deletion via: admin@mindgrind.co.za
- Deletion timeframe: Within 30 days

**Does your app provide a way for users to request that their data be deleted?** ✅ **Yes**
- Contact method: Email (admin@mindgrind.co.za)
- Process: User sends request, data deleted within 30 days

---

## Section 5: Privacy Policy

**Privacy Policy URL**: [Your hosted privacy policy URL]

**Privacy Policy Requirements Met**:
- ✅ What data is collected
- ✅ How data is used
- ✅ Third-party services disclosed
- ✅ User rights (GDPR/CCPA)
- ✅ Data security measures
- ✅ Contact information
- ✅ Data deletion process

---

## Section 6: Data Sharing

### Third-Party Services

**Supabase**:
- **Purpose**: Backend services, account management
- **Data shared**: Email address (if user creates account)
- **Data type**: Account information
- **Security**: Encrypted in transit and at rest
- **Privacy policy**: https://supabase.com/privacy

**Google AdMob**:
- **Purpose**: Displaying advertisements; ad measurement
- **Data shared / processed**: Advertising identifiers, device/app interaction data related to ads (as described in Google's policies)
- **Data type**: Device or other IDs; app activity related to ads
- **Security**: Encrypted in transit (HTTPS)
- **Privacy policy**: https://policies.google.com/privacy

---

## Section 7: Age Restrictions

**Does your app collect data from children?** ❌ **No**

**Age restriction**: The Service is intended for **users aged 13 and older**, consistent with the privacy policy. The app does not knowingly collect personal information from children under 13.

**COPPA compliance**: ✅ **Yes** — The app does not knowingly collect personal information from children under 13. In Play Console, set **target audience** to **13+** (not children) if you are not targeting users under 13.

---

## Section 8: Sensitive Permissions

**Does your app use sensitive permissions?** ❌ **No**

The app only requests:
- `INTERNET` permission (for Supabase, ads, and related services)
- No location, camera, microphone, or other sensitive permissions

---

## Quick Reference Checklist

When filling out the form, ensure you select:

### Data Collected:
- [x] Account information (Email) - Optional, Shared with Supabase
- [x] App activity (Game progress) - Required, Not shared, Local only
- [x] Device or other IDs (Advertising) - Via Google AdMob, Shared with Google

### Data NOT Collected:
- [x] Location
- [x] Personal identifiers (except optional email)
- [x] Financial information
- [x] Contacts
- [x] Photos or media
- [x] Health information

### Security:
- [x] Data encrypted in transit
- [x] Data encrypted at rest
- [x] Users can request deletion
- [x] Privacy policy provided

### Third Parties:
- [x] Supabase (Account management only)
- [x] Google AdMob (Advertising and ad measurement)

---

## Common Questions

### Q: Do we collect device IDs?
**A**: The app integrates **Google AdMob**, which may process **advertising identifiers** for ads and measurement. Declare this in Data Safety and disclose AdMob in your privacy policy (see Section 2.3).

### Q: Do we collect location data?
**A**: No. The app does not request location permissions.

### Q: Is account creation required?
**A**: No. Account creation is optional. Users can play without creating an account.

### Q: What happens to local game data?
**A**: Game progress is stored locally on the device only. It's not transmitted to servers.

### Q: Can users delete their data?
**A**: Yes. Users can request data deletion via email (admin@mindgrind.co.za). Data will be deleted within 30 days.

---

## Verification Steps

After completing the form:

1. ✅ Review all answers for accuracy
2. ✅ Ensure privacy policy URL is accessible
3. ✅ Verify privacy policy matches form answers
4. ✅ Double-check data sharing disclosures
5. ✅ Confirm security practices are accurate
6. ✅ Submit for review

---

## Updates

If you add new features that collect data in the future:

1. Update this guide
2. Update your privacy policy
3. Update the Data Safety form in Play Console
4. Resubmit for review if necessary

---

## Support

If you have questions about data collection:
- Review your privacy policy
- Check the app source code
- Contact: admin@mindgrind.co.za

---

**Last Updated**: January 2025



















