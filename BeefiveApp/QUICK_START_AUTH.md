# Quick Start: Authentication Setup

## 🚀 Quick Setup (5 minutes)

### Step 1: Copy Supabase Credentials

1. **Open your web project's `.env.local` file:**
   - Path: `bee-five-web/.env.local`
   - If it doesn't exist, check Supabase Dashboard → Settings → API

2. **Copy these two values:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Create .env File in React Native App

1. **Navigate to BeefiveApp directory:**
   ```bash
   cd BeefiveApp
   ```

2. **Create `.env` file** and add:
   ```env
   SUPABASE_URL=your-url-from-web-version
   SUPABASE_ANON_KEY=your-key-from-web-version
   ```

   **Important:** Use the exact same values from your web `.env.local`, just different variable names!

### Step 3: Rebuild the App

```bash
# Stop Metro if running (Ctrl+C)
npm start -- --reset-cache

# In another terminal, rebuild:
npm run android  # or npm run ios
```

### Step 4: Test

1. **Launch the app**
2. **You should see the Sign In page** (not the main menu)
3. **Sign in** with an account from your web version
4. **After signing in**, you'll see the main menu

## ✅ What Changed

- **Authentication is now required** - Users must sign in before accessing the main menu
- **Same database** - Uses the same Supabase project as your web version
- **Automatic redirect** - App automatically shows Sign In if not logged in

## 📝 Example .env File

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.xxxxx
```

## 🆘 Troubleshooting

**"Supabase is not configured"**
- ✅ Check `.env` file exists in `BeefiveApp/` directory
- ✅ Verify variable names: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- ✅ Rebuild the app after creating `.env`

**Still seeing main menu without login**
- ✅ Make sure you rebuilt the app
- ✅ Clear Metro cache: `npm start -- --reset-cache`

For detailed setup, see `AUTH_SETUP_GUIDE.md`










