# Supabase Setup for React Native

This guide explains how to configure Supabase credentials that are shared with the web version.

## Quick Setup

1. **Create a `.env` file** in the `BeefiveApp` directory (same level as `package.json`)

2. **Add your Supabase credentials** to the `.env` file:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Get your credentials from the web version:**
   - Open `bee-five-web/.env.local`
   - Copy the values from `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL`
   - Copy the values from `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `SUPABASE_ANON_KEY`

4. **Install dependencies:**
   ```bash
   cd BeefiveApp
   npm install
   ```

5. **Rebuild the app** (required after adding .env file):
   ```bash
   # For Android
   npm run android
   
   # For iOS
   cd ios && pod install && cd ..
   npm run ios
   ```

## Sharing Credentials with Web Version

To keep credentials in sync:

1. **Option A: Manual sync**
   - When you update `bee-five-web/.env.local`, also update `BeefiveApp/.env`
   - Use the same values (just different variable names)

2. **Option B: Shared .env file** (Advanced)
   - Create a `.env` file at the root level (`bee-five/`)
   - Use a script to copy values to both projects
   - Or use a symlink (not recommended for cross-platform)

## Variable Names

- **Web version** uses: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **React Native** uses: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- **Values are the same**, just different variable names

## Troubleshooting

### "Supabase is not configured" error

1. ✅ Check that `.env` file exists in `BeefiveApp/` directory
2. ✅ Verify variable names are exactly: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
3. ✅ Make sure values don't have quotes around them
4. ✅ **Rebuild the app** after creating/modifying `.env` file
5. ✅ Clear Metro bundler cache: `npm start -- --reset-cache`

### Environment variables not loading

- React Native requires a **rebuild** after adding/changing `.env` files
- The `.env` file is loaded at build time, not runtime
- Make sure `react-native-dotenv` is installed: `npm install react-native-dotenv`

## Security

✅ **Safe to commit to git:**
- `.env.example` (template file)

❌ **Never commit:**
- `.env` (contains actual credentials)
- `.env.local` (web version)

The `.env` file should be in `.gitignore` (already configured).











