# Authentication & Progress Tracking Setup

This guide will help you set up user authentication and progress tracking for Bee-Five so that player progress syncs between web and app versions.

## Overview

The authentication system uses Supabase Auth and stores adventure game progress in a database. When users sign in, their progress (current game, unlocked games, games completed, games won) is automatically saved and synced across devices.

## Step 1: Set Up Database Tables

1. **Go to your Supabase project** and open the **SQL Editor**

2. **Run the adventure progress schema SQL:**
   - Copy the contents of `adventure-progress-schema.sql`
   - Paste into the SQL Editor
   - Click "Run"

   This creates:
   - `user_profiles` table - stores user metadata
   - `adventure_progress` table - stores adventure game progress
   - Automatic triggers to create profiles on signup
   - Row Level Security (RLS) policies for data protection

## Step 2: Enable Authentication Providers (Optional)

1. **Go to Authentication → Providers** in Supabase dashboard

2. **Enable Email provider** (should be enabled by default)

3. **Optional: Enable OAuth providers:**
   - **Google**: Enable and configure with Google OAuth credentials
   - **GitHub**: Enable and configure with GitHub OAuth credentials

   See [Supabase Auth docs](https://supabase.com/docs/guides/auth) for OAuth setup instructions.

## Step 3: Verify Environment Variables

Make sure your `.env.local` file has Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Step 4: Test Authentication

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Open the app** in your browser

3. **Click "Sign In / Sign Up"** button in the main menu

4. **Test sign up:**
   - Enter email and password
   - Click "Sign Up"
   - Check your email for confirmation link (if email confirmation is enabled)

5. **Test sign in:**
   - Enter your credentials
   - Click "Sign In"
   - You should see your email in the menu

## Step 5: Test Progress Saving

1. **Sign in** to your account

2. **Start Adventure Mode**

3. **Play and win some games**

4. **Check the database:**
   - Go to Supabase → Table Editor → `adventure_progress`
   - You should see your user ID and progress data

5. **Test progress loading:**
   - Sign out and sign back in
   - Start Adventure Mode again
   - Your progress should be restored!

## Features

### What Gets Saved

- **Current Game**: The last game number you were on
- **Highest Unlocked Game**: The highest game you've unlocked
- **Games Completed**: Array of all completed game numbers
- **Games Won**: Total number of games won

### Auto-Save

Progress is automatically saved when:
- You win a game
- You complete a game
- You unlock a new game

The system uses a 2-second debounce to avoid too many database writes.

### Cross-Platform Sync

Since progress is stored in Supabase, it will sync automatically between:
- Web version (bee-five-web)
- App version (bee-five-app) - when you implement it

Both versions use the same database and authentication system.

## Security

- **Row Level Security (RLS)** is enabled on all tables
- Users can only read/write their own progress
- Authentication tokens are handled securely by Supabase

## Troubleshooting

### Issue: "Supabase is not configured"
- Check that `.env.local` exists and has correct values
- Restart your dev server after changing `.env.local`

### Issue: Progress not saving
- Make sure you're signed in
- Check browser console for errors
- Verify the database tables were created correctly
- Check that RLS policies allow user to insert/update their own data

### Issue: Can't sign up
- Check if email confirmation is required (disable in Supabase Auth settings for development)
- Check Supabase dashboard → Authentication → Users for error messages

### Issue: Progress not loading
- Make sure you're signed in with the same account
- Check browser console for errors
- Verify the `adventure_progress` table has data for your user ID

## Next Steps

1. **Implement the app version** (`bee-five-app`) using the same Supabase credentials
2. **Test cross-platform sync** by playing on web, then continuing on app
3. **Customize authentication UI** if needed
4. **Add more progress tracking** (e.g., achievements, stats)

## API Reference

### `useAuth()` Hook

```typescript
const { user, session, loading, signUp, signIn, signOut, signInWithProvider } = useAuth();
```

- `user`: Current user object (null if not signed in)
- `session`: Current session object
- `loading`: Boolean indicating if auth state is being checked
- `signUp(email, password)`: Sign up new user
- `signIn(email, password)`: Sign in existing user
- `signOut()`: Sign out current user
- `signInWithProvider('google' | 'github')`: Sign in with OAuth provider

### Progress Service

```typescript
// Load progress
const progress = await loadAdventureProgress(userId);

// Save progress manually
await saveAdventureProgress(userId, {
  current_game: 5,
  highest_unlocked_game: 5,
  games_completed: [1, 2, 3, 4],
  games_won: 4,
});

// Auto-save (debounced)
autoSaveProgress(userId, {
  current_game: 5,
  // ... other fields
});
```

Happy coding! 🐝

