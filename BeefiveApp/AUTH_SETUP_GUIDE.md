# Authentication Setup Guide

This guide will help you configure the React Native app to use the same Supabase database as your web version.

## Step 1: Get Your Supabase Credentials from Web Version

1. **Open your web project's environment file:**
   - Navigate to `bee-five-web/.env.local`
   - If you don't have this file, check `bee-five-web/.env` or create it

2. **Find these two values:**
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

   Example:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Step 2: Create .env File in React Native App

1. **Navigate to the BeefiveApp directory:**
   ```bash
   cd BeefiveApp
   ```

2. **Create a `.env` file** (if it doesn't exist):
   ```bash
   # Windows PowerShell
   New-Item .env
   
   # Mac/Linux
   touch .env
   ```

3. **Add your Supabase credentials to `.env`:**
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   **Important Notes:**
   - Copy the **exact same values** from your web `.env.local`
   - Use `SUPABASE_URL` (not `NEXT_PUBLIC_SUPABASE_URL`)
   - Use `SUPABASE_ANON_KEY` (not `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **No quotes** around the values
   - **No spaces** around the `=` sign

## Step 3: Verify Your .env File

Your `BeefiveApp/.env` file should look like this:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here...
```

## Step 4: Rebuild the App

**IMPORTANT:** React Native requires a rebuild after adding/changing `.env` files.

### For Android:
```bash
# Stop Metro bundler if running (Ctrl+C)
npm start -- --reset-cache
# In another terminal:
npm run android
```

### For iOS:
```bash
# Stop Metro bundler if running (Ctrl+C)
cd ios && pod install && cd ..
npm start -- --reset-cache
# In another terminal:
npm run ios
```

## Step 5: Verify It's Working

1. **Launch the app**
2. **You should see the Sign In page** (if not logged in)
3. **Try signing in** with an account from your web version
4. **If successful**, you'll see the main menu

## Troubleshooting

### "Supabase is not configured" error

1. ✅ Check that `.env` file exists in `BeefiveApp/` directory
2. ✅ Verify variable names are exactly: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
3. ✅ Make sure values don't have quotes around them
4. ✅ **Rebuild the app** after creating/modifying `.env` file
5. ✅ Clear Metro bundler cache: `npm start -- --reset-cache`

### Can't find web .env.local file

If you don't have a `.env.local` file in your web project:

1. **Get credentials from Supabase Dashboard:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Navigate to **Settings → API**
   - Copy:
     - **Project URL** → Use as `SUPABASE_URL`
     - **anon/public key** → Use as `SUPABASE_ANON_KEY`

2. **Create the `.env` file** in `BeefiveApp/` with these values

### App still shows "not configured" after rebuild

1. **Double-check your `.env` file:**
   - Make sure it's in `BeefiveApp/` (not in parent directory)
   - Check for typos in variable names
   - Verify values are correct (no extra spaces)

2. **Clear all caches:**
   ```bash
   # Clear Metro cache
   npm start -- --reset-cache
   
   # For Android, also clear build cache:
   cd android
   ./gradlew clean
   cd ..
   
   # For iOS, clean build folder in Xcode
   ```

3. **Rebuild completely:**
   ```bash
   # Android
   npm run android
   
   # iOS
   npm run ios
   ```

## Keeping Credentials in Sync

When you update your web version's Supabase credentials:

1. Update `bee-five-web/.env.local`
2. **Also update** `BeefiveApp/.env` with the same values
3. Rebuild the React Native app

## Security Notes

- ✅ `.env` file is already in `.gitignore` (won't be committed)
- ❌ Never commit your `.env` file to git
- ✅ The anon key is safe to use in mobile apps (it's public)
- ✅ Row Level Security (RLS) in Supabase protects your data

---

**Next Steps:** After setting up credentials, the app will automatically show authentication screens before the main menu if you're not logged in.










