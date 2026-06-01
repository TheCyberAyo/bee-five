# Troubleshooting "Supabase is not configured"

If you're seeing the error: **"Supabase is not configured. Please set up your Supabase credentials in .env.local"**

Follow these steps in order:

## ✅ Step 1: Verify .env.local File

1. Make sure `.env.local` exists in your project root (same folder as `package.json`)
2. Check it contains both variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. **Important:** 
   - No spaces around the `=` sign
   - No quotes around the values (unless the value itself contains spaces)
   - No trailing spaces after values

## ✅ Step 2: Restart Development Server

**This is the most common fix!**

Environment variables are only loaded when the Next.js dev server starts. If you:
- Created `.env.local` while the server was running
- Modified `.env.local` while the server was running

You must restart:

1. **Stop the server:** Press `Ctrl+C` in the terminal
2. **Start again:** Run `npm run dev`
3. **Wait for it to fully start** (look for "Ready" message)
4. **Refresh your browser** (or open a new tab)

## ✅ Step 3: Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Look for any error messages
4. You should see logs like:
   ```
   Supabase Configuration Check:
   - URL present: true
   - Key present: true
   - Configured: true
   ```

## ✅ Step 4: Verify Environment Variables Are Loaded

In your browser console, run:
```javascript
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

**Expected output:**
- URL should show your Supabase URL
- Key should show the beginning of your anon key

**If both show `undefined`:**
- The environment variables aren't being loaded
- Make sure the file is named exactly `.env.local` (not `.env`, `.env.production`, etc.)
- Restart the dev server

## ✅ Step 5: Check File Location

Make sure `.env.local` is in the **project root**, not in `src/` or any subfolder:

```
Bee Five/
  ├── .env.local          ← Should be here
  ├── package.json
  ├── next.config.ts
  └── src/
      └── ...
```

## ✅ Step 6: Clear Next.js Cache

Sometimes Next.js caches can cause issues:

1. Stop the dev server
2. Delete `.next` folder (if it exists)
3. Restart: `npm run dev`

## ✅ Step 7: Check for Syntax Errors

Make sure your `.env.local` file:
- Has no empty lines between variables (or blank lines are OK)
- Uses `=` not `:` or any other separator
- Has no special characters that need escaping
- Each variable is on its own line

**Good:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

**Bad:**
```env
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co  ← Space around =
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbG..."             ← Quotes around value
NEXT_PUBLIC_SUPABASE_URL: https://xxxxx.supabase.co  ← Wrong separator
```

## ✅ Step 8: Verify Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings → API**
4. Verify:
   - **Project URL** matches what's in `.env.local`
   - **anon/public key** matches what's in `.env.local`

## 🔍 Still Not Working?

If none of the above works:

1. **Check terminal output** when starting the dev server - look for any warnings about environment variables
2. **Try creating a fresh `.env.local` file:**
   - Delete the old one
   - Create a new one with just these two lines (no comments, no extra formatting)
   - Restart the server

3. **Run the verification script:**
   ```bash
   node verify-setup.js
   ```
   This will test if the environment variables are being read correctly

4. **Check if you're in the right directory:**
   ```bash
   pwd  # Should show your project root
   ls -la | grep env  # Should show .env.local
   ```

## 📝 Common Mistakes

❌ **"I added the variables but didn't restart the server"**
   - ✅ Solution: Always restart after changing `.env.local`

❌ **"I put the file in the wrong location"**
   - ✅ Solution: Must be in project root, not in `src/`

❌ **"I have spaces around the = sign"**
   - ✅ Solution: Remove spaces: `KEY=value` not `KEY = value`

❌ **"I'm using the service role key instead of anon key"**
   - ✅ Solution: Use the **anon/public** key, not the service_role key

❌ **"I copied the values with extra spaces"**
   - ✅ Solution: Check for trailing/leading whitespace in values

## 🚀 For Production/Deployed Versions

If this works locally but not in production:
- Environment variables must be set in your deployment platform
- See `DEPLOYMENT_SETUP.md` for platform-specific instructions

---

## Quick Checklist

- [ ] `.env.local` exists in project root
- [ ] Both variables are present and correct
- [ ] No spaces around `=` signs
- [ ] No quotes around values
- [ ] Dev server was restarted after creating/modifying `.env.local`
- [ ] Browser console shows environment variables are loaded
- [ ] Credentials match what's in Supabase Dashboard

If you've checked all of these and it still doesn't work, there may be a deeper configuration issue. Check the terminal output when starting the server for any errors.

