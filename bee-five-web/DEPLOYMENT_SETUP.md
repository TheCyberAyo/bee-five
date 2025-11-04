# Deployment Setup Guide

This guide explains how to configure Supabase environment variables for both local development and production deployments.

---

## 🏠 Local Development Setup

**If you're seeing this error while running locally**, you need to create a `.env.local` file.

### Quick Setup for Local Development

1. **Get your Supabase credentials:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Navigate to **Settings → API**
   - Copy:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **anon/public key** (starts with `eyJhbG...`)

2. **Create `.env.local` file** in your project root (`bee-five-web/` folder):
   ```bash
   # Create the file (or use your code editor)
   touch .env.local
   ```

3. **Add these variables** to `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Restart your development server:**
   ```bash
   # Stop the server (Ctrl+C), then:
   npm run dev
   ```

5. **Verify:** The warning should disappear and Supabase should be configured! ✅

**Note:** See `SUPABASE_SETUP.md` for detailed setup instructions including database table creation.

---

## 🚀 Production Deployment Setup

This guide explains how to configure Supabase environment variables for production deployments.

### The Problem

Your `.env.local` file contains your Supabase credentials, but this file is:
- Not committed to git (for security)
- Not available in production builds
- Only works in local development

**You must configure environment variables in your deployment platform!**

---

## Platform-Specific Instructions

### 🚀 Vercel (Recommended for Next.js)

Vercel is the easiest platform for deploying Next.js apps.

#### Step 1: Get Your Supabase Credentials
If you don't have them handy:
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJhbG...`)

#### Step 2: Add Environment Variables in Vercel

**Option A: Via Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

   ```
   Name: NEXT_PUBLIC_SUPABASE_URL
   Value: https://your-project-ref.supabase.co
   ```

   ```
   Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. Select **Production**, **Preview**, and **Development** environments
6. Click **Save**

**Option B: Via Vercel CLI**
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste your Supabase URL when prompted
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste your anon key when prompted
```

#### Step 3: Redeploy
After adding environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on your latest deployment
   - OR push a new commit to trigger a new deployment

**Important:** Environment variables are baked into the build at build time, so you must redeploy after adding/changing them!

---

### 🌐 Netlify

#### Step 1: Get Your Supabase Credentials
(Follow same steps as Vercel above)

#### Step 2: Add Environment Variables
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site configuration** → **Environment variables**
4. Click **Add variable**
5. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
6. Click **Save**

#### Step 3: Redeploy
Trigger a new deployment or redeploy from the **Deploys** tab.

---

### 🔵 Railway

#### Step 1: Get Your Supabase Credentials
(Follow same steps as Vercel above)

#### Step 2: Add Environment Variables
1. Go to Railway dashboard
2. Select your project
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add both variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Railway will automatically redeploy

---

### 🐳 Docker / Other Platforms

If deploying manually or with Docker:

1. **Create `.env.production` file** (or set in your platform):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **For Docker**, add to `docker-compose.yml` or Dockerfile:
   ```yaml
   environment:
     - NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
     - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   ```

---

## Verification After Deployment

After deploying and setting environment variables:

1. **Open your deployed app**
2. **Open browser DevTools** (F12)
3. **Go to Console tab**
4. **Navigate to multiplayer lobby**
5. **Check for errors:**
   - ❌ "Supabase is not configured" = environment variables not set
   - ✅ No errors = should work!

You can also check if variables are loaded:
```javascript
// In browser console on your deployed site:
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
// Should show your Supabase URL (not undefined)
```

---

## Troubleshooting

### Issue: Still shows "Supabase is not configured"

**Solutions:**
1. ✅ Verify environment variables are set in your deployment platform
2. ✅ Make sure variable names are **exactly**:
   - `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not `SUPABASE_ANON_KEY`)
3. ✅ **Redeploy** after adding/changing variables
4. ✅ Check for typos in the values (no extra spaces, correct URL format)

### Issue: Works locally but not in production

- ✅ Environment variables only work locally in `.env.local`
- ✅ You MUST set them in your deployment platform
- ✅ Next.js bundles `NEXT_PUBLIC_*` variables at build time
- ✅ Redeploy after adding variables

### Issue: Environment variables not showing up

**For Vercel:**
- Make sure variables are added to **Production** environment (not just Preview/Development)
- Redeploy after adding variables
- Check build logs to verify variables are loaded

**For other platforms:**
- Check platform-specific documentation
- Some platforms require a restart/redeploy
- Verify variable names match exactly (case-sensitive)

---

## Security Notes

✅ **Safe to expose publicly:**
- `NEXT_PUBLIC_SUPABASE_URL` - This is your public Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - This is your anonymous/public key (designed to be public)

🔒 **Never expose:**
- Service role key (has admin access)
- Database password
- Any keys that don't start with `anon`

The `NEXT_PUBLIC_*` prefix tells Next.js these are safe to bundle with client-side code.

---

## Quick Reference

**Required Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find them:**
- Supabase Dashboard → Settings → API

**After setting:**
- ✅ Redeploy your application
- ✅ Test in browser console
- ✅ Check multiplayer functionality

---

## Need Help?

If you're still having issues:
1. Check browser console for specific error messages
2. Verify environment variables are set in deployment platform
3. Ensure you've redeployed after setting variables
4. Compare working local setup with production deployment

Happy deploying! 🚀🐝

