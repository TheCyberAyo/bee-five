# Hosting Your Privacy Policy Online

AdMob and app stores **require** a publicly accessible privacy policy URL. Here's how to host yours:

## Quick Options (Free)

### Option 1: GitHub Pages (Recommended - Free & Easy)

1. **Create a GitHub account** (if you don't have one): [github.com](https://github.com)

2. **Create a new repository**:
   - Name it: `beefive-privacy-policy` (or similar)
   - Make it **public**
   - Don't initialize with README

3. **Create the privacy policy file**:
   - Create a file named `index.html`
   - Copy the content from `BeefiveApp/src/components/PrivacyPolicy.tsx` and convert to HTML
   - Or use a simple HTML version (see template below)

4. **Upload and publish**:
   ```bash
   git init
   git add index.html
   git commit -m "Add privacy policy"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/beefive-privacy-policy.git
   git push -u origin main
   ```

5. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / `root`
   - Save

6. **Your URL will be**:
   `https://YOUR_USERNAME.github.io/beefive-privacy-policy/`

### Option 2: Netlify (Free & Very Easy)

1. Go to [netlify.com](https://www.netlify.com) and sign up
2. Create a new site
3. Drag and drop a folder containing your `index.html` file
4. Get your URL: `https://YOUR-SITE-NAME.netlify.app`

### Option 3: Vercel (Free)

1. Go to [vercel.com](https://vercel.com) and sign up
2. Create a new project
3. Upload your HTML file
4. Get your URL: `https://YOUR-SITE-NAME.vercel.app`

### Option 4: Google Sites (Free)

1. Go to [sites.google.com](https://sites.google.com)
2. Create a new site
3. Copy and paste your privacy policy content
4. Publish and get your URL

## HTML Template

Here's a simple HTML template you can use:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bee Five Privacy Policy</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #1a1a1a;
            color: #ffffff;
        }
        h1 {
            color: #FFC30B;
            border-bottom: 2px solid #FFC30B;
            padding-bottom: 10px;
        }
        h2 {
            color: #FFC30B;
            margin-top: 30px;
        }
        a {
            color: #FFC30B;
            text-decoration: underline;
        }
        .contact-box {
            background: rgba(255, 195, 11, 0.1);
            border: 2px solid #FFC30B;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 195, 11, 0.3);
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
        }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    
    <p><strong>Last Updated:</strong> January 2026</p>
    
    <p>Bee Five ("we", "our", or "us") operates the Bee Five mobile application (the "Service"), developed by MindGrind. This page informs you of our policies regarding the collection, use, and disclosure of personal information when you use our Service.</p>
    
    <h2>Information We Collect</h2>
    <p>We may collect the following types of information:</p>
    <ul>
        <li><strong>Non-personal data:</strong> Device information, operating system, app version, and general usage statistics</li>
        <li><strong>Account information:</strong> If you sign up for an account or multiplayer features, we may collect an email address for login and account management purposes</li>
        <li><strong>Game progress:</strong> Local game progress and statistics stored on your device</li>
    </ul>
    <p>We do not collect sensitive personal information such as payment details, location data, or contact lists.</p>
    
    <h2>AdMob and Google Ads Usage</h2>
    <p>Our app uses Google AdMob to display advertisements. AdMob may collect and use data to provide personalized ads and measure ad performance.</p>
    
    <h3>Data Collected by AdMob:</h3>
    <ul>
        <li>Device identifiers (such as Android Advertising ID or iOS Identifier for Advertisers)</li>
        <li>IP address</li>
        <li>App usage data and interactions with ads</li>
        <li>Device information (model, OS version, language)</li>
    </ul>
    
    <p>This data is used to show you relevant advertisements, measure ad performance, and prevent fraud. AdMob's use of information is governed by Google's Privacy Policy. You can learn more at <a href="https://policies.google.com/privacy" target="_blank">policies.google.com/privacy</a>.</p>
    
    <p>You can opt out of personalized advertising by visiting <a href="https://adssettings.google.com" target="_blank">adssettings.google.com</a>.</p>
    
    <h2>Third-Party Services</h2>
    <p>Our app may use the following third-party services:</p>
    <ul>
        <li><strong>Google AdMob:</strong> For displaying advertisements</li>
        <li><strong>Supabase:</strong> For backend services and data storage (if applicable)</li>
    </ul>
    <p>These services have their own privacy policies governing the collection and use of your information.</p>
    
    <h2>Your Rights (GDPR & CCPA)</h2>
    <p>If you are located in the European Economic Area (EEA) or California, you have the following rights:</p>
    <ul>
        <li><strong>Right to Access:</strong> You can request a copy of the personal data we hold about you</li>
        <li><strong>Right to Rectification:</strong> You can request correction of inaccurate personal data</li>
        <li><strong>Right to Erasure:</strong> You can request deletion of your personal data</li>
        <li><strong>Right to Data Portability:</strong> You can request your data in a portable format</li>
        <li><strong>Right to Object:</strong> You can object to processing of your personal data</li>
        <li><strong>Right to Withdraw Consent:</strong> You can withdraw consent for data processing at any time</li>
    </ul>
    <p>To exercise these rights, please contact us using the information provided in the "Contact Us" section below.</p>
    
    <h2>Children's Privacy</h2>
    <p>Our Service is suitable for users ages 13 and above. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.</p>
    
    <h2>Data Security</h2>
    <p>We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure.</p>
    
    <h2>Data Retention</h2>
    <p>We retain your personal information only for as long as necessary to provide our Service. When you request deletion of your data, we will delete it within 30 days, except where we are required to retain it by law.</p>
    
    <h2>Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
    
    <h2>Contact Us</h2>
    <p>If you have any questions about this Privacy Policy, wish to exercise your rights, or need to contact us regarding your personal data, please reach out to us:</p>
    
    <div class="contact-box">
        <p><strong>Email:</strong> admin@mindgrind.co.za</p>
        <p><strong>Developer:</strong> MindGrind</p>
        <p><strong>App:</strong> Bee Five</p>
    </div>
    
    <p>We will respond to your inquiry within 30 days.</p>
    
    <div class="footer">
        <p>© 2026 Bee Five. Product of MindGrind.</p>
    </div>
</body>
</html>
```

## Adding URL to AdMob

Once you have your privacy policy URL:

1. Go to [AdMob Console](https://admob.google.com)
2. Navigate to **Apps** → Select your app
3. Click **App settings**
4. Find **Privacy Policy URL** field
5. Enter your URL (e.g., `https://YOUR_USERNAME.github.io/beefive-privacy-policy/`)
6. Save

## Adding URL to App Stores

### Google Play Store:
- Go to Play Console → Your app → Store listing
- Add Privacy Policy URL in the required field

### Apple App Store:
- Go to App Store Connect → Your app → App Information
- Add Privacy Policy URL in the required field

## Important Notes

- ✅ The URL must be publicly accessible (no login required)
- ✅ The URL must use HTTPS (secure connection)
- ✅ The privacy policy must be in a language your users understand
- ✅ Keep the URL updated if you move the policy

---

**Quick Start:** Use GitHub Pages - it's free, reliable, and takes about 10 minutes to set up!


