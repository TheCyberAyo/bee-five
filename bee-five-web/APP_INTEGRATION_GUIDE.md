# App Integration Guide

This guide explains what you need to do to integrate authentication and progress tracking into your mobile app (`bee-five-app`) so it syncs with the web version.

## Overview

The app needs to:
1. Use the same Supabase instance (same database)
2. Share the same authentication system
3. Use the same progress tracking service
4. Call the same database tables

## Step 1: Set Up Supabase in Your App

### If using React Native / Expo:

1. **Install Supabase client:**
   ```bash
   npm install @supabase/supabase-js
   # or for Expo
   expo install @supabase/supabase-js
   ```

2. **Install authentication helpers** (if needed):
   ```bash
   # For React Native with Expo
   npm install @react-native-async-storage/async-storage
   ```

### If using Flutter:

1. **Add Supabase to `pubspec.yaml`:**
   ```yaml
   dependencies:
     supabase_flutter: ^2.0.0
   ```

2. **Run:**
   ```bash
   flutter pub get
   ```

### If using native iOS/Android:

- iOS: Install via CocoaPods or SPM
- Android: Install via Gradle

## Step 2: Copy Configuration Files

You'll need these from `bee-five-web`:

1. **Copy the Supabase client setup:**
   - Copy `src/lib/supabase.ts` to your app
   - Update paths as needed for your app structure

2. **Use the same environment variables:**
   - Same `NEXT_PUBLIC_SUPABASE_URL`
   - Same `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   
   **For React Native:** Use `.env` or `react-native-config`
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

   **For Flutter:** Use `.env` with `flutter_dotenv`
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

## Step 3: Copy Core Services

Copy these files from `bee-five-web/src` to your app:

1. **Authentication Context:**
   - Copy `contexts/AuthContext.tsx` (or adapt for your app's state management)
   - Adapt for your app framework:
     - React Native: May need AsyncStorage for session persistence
     - Flutter: Use Flutter state management (Provider, Riverpod, etc.)

2. **Progress Service:**
   - Copy `services/progressService.ts`
   - Ensure it uses the same Supabase client

## Step 4: Copy UI Components (Adapt as Needed)

1. **Auth UI:**
   - Copy `components/Auth/AuthModal.tsx` → adapt to your app's UI framework
   - Copy `components/Auth/UserProfile.tsx` → adapt to your app's UI framework
   - Replace React/web styling with your app's UI components

2. **Integration points:**
   - Add auth buttons to your main menu
   - Show user status when logged in
   - Handle auth state changes

## Step 5: Integrate into Adventure Game

In your app's Adventure Game component:

1. **Import the auth and progress services:**
   ```typescript
   import { useAuth } from '../contexts/AuthContext';
   import { loadAdventureProgress, autoSaveProgress } from '../services/progressService';
   ```

2. **Load progress on mount:**
   ```typescript
   useEffect(() => {
     const loadProgress = async () => {
       if (user && !progressLoaded) {
         const progress = await loadAdventureProgress(user.id);
         if (progress) {
           // Set your game state from progress
           setCurrentGame(progress.current_game);
           setHighestUnlockedGame(progress.highest_unlocked_game);
           // ... etc
         }
       }
     };
     loadProgress();
   }, [user]);
   ```

3. **Save progress on game events:**
   ```typescript
   // When player wins
   if (user && gameWon) {
     autoSaveProgress(user.id, {
       current_game: currentGame + 1,
       highest_unlocked_game: Math.max(highestUnlockedGame, currentGame + 1),
       games_completed: [...gamesCompleted, currentGame],
       games_won: gamesWon + 1,
     });
   }
   ```

## Step 6: Platform-Specific Adaptations

### React Native / Expo Specific:

```typescript
// Use AsyncStorage for session persistence
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### Flutter Specific:

```dart
// Initialize Supabase in main.dart
await Supabase.initialize(
  url: 'YOUR_SUPABASE_URL',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
);

// Use Supabase client
final supabase = Supabase.instance.client;
```

### Native iOS (Swift):

```swift
import Supabase

let client = SupabaseClient(
  supabaseURL: URL(string: "YOUR_SUPABASE_URL")!,
  supabaseKey: "YOUR_SUPABASE_ANON_KEY"
)
```

### Native Android (Kotlin):

```kotlin
val supabase = SupabaseClient(
  supabaseUrl = "YOUR_SUPABASE_URL",
  supabaseKey = "YOUR_SUPABASE_ANON_KEY"
)
```

## Step 7: Test Cross-Platform Sync

1. **Sign up on web version**
2. **Play some games on web, win a few**
3. **Sign in on app with same credentials**
4. **Verify progress loads correctly**
5. **Play more games on app**
6. **Check web version - progress should update**

## Step 8: Handle Offline/Online States

Consider adding:

1. **Offline detection:**
   - Check network connectivity
   - Queue progress saves when offline
   - Sync when connection restored

2. **Conflict resolution:**
   - If progress exists on both platforms, use latest timestamp
   - Or merge progress intelligently

## Step 9: Database Access

**No additional database setup needed!**

- ✅ Tables are already created (from `adventure-progress-schema.sql`)
- ✅ RLS policies allow authenticated users to access their data
- ✅ Same Supabase instance = same database = automatic sync

## File Checklist

What to copy from `bee-five-web/src`:

```
✅ contexts/AuthContext.tsx (adapt for your framework)
✅ services/progressService.ts
✅ components/Auth/AuthModal.tsx (adapt UI)
✅ components/Auth/UserProfile.tsx (adapt UI)
✅ lib/supabase.ts (adapt client creation)
```

What NOT to copy (web-specific):

```
❌ app/layout.tsx (Next.js specific)
❌ App.tsx (may be different structure)
❌ Any Next.js specific imports
```

## Common Issues & Solutions

### Issue: "Session not persisting"
- **React Native:** Make sure AsyncStorage is configured in Supabase client
- **Flutter:** Ensure secure storage is set up
- **Native:** Check token storage implementation

### Issue: "OAuth redirects not working"
- Mobile apps handle OAuth differently (deep links)
- May need to configure URL schemes for your app
- See Supabase mobile auth docs for platform-specific setup

### Issue: "Progress not syncing"
- Check both web and app are using same Supabase project
- Verify user is signed in on both platforms
- Check browser/device console for errors
- Verify RLS policies allow user access

### Issue: "Type errors"
- Copy TypeScript interfaces from web version
- Ensure Supabase types match (may need to regenerate types)

## Example: React Native Integration

```typescript
// App.tsx or similar
import { AuthProvider } from './contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <YourAppContent />
    </AuthProvider>
  );
}

// AdventureGameScreen.tsx
import { useAuth } from '../contexts/AuthContext';
import { loadAdventureProgress, autoSaveProgress } from '../services/progressService';

export function AdventureGameScreen() {
  const { user } = useAuth();
  const [currentGame, setCurrentGame] = useState(1);
  
  useEffect(() => {
    if (user) {
      loadAdventureProgress(user.id).then(progress => {
        if (progress) {
          setCurrentGame(progress.current_game);
        }
      });
    }
  }, [user]);
  
  // ... rest of game logic
}
```

## Example: Flutter Integration

```dart
// main.dart
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );
  runApp(MyApp());
}

// adventure_game_screen.dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/progress_service.dart';

class AdventureGameScreen extends StatefulWidget {
  @override
  _AdventureGameScreenState createState() => _AdventureGameScreenState();
}

class _AdventureGameScreenState extends State<AdventureGameScreen> {
  final supabase = Supabase.instance.client;
  int currentGame = 1;
  
  @override
  void initState() {
    super.initState();
    loadProgress();
  }
  
  Future<void> loadProgress() async {
    final user = supabase.auth.currentUser;
    if (user != null) {
      final progress = await loadAdventureProgress(user.id);
      if (progress != null) {
        setState(() {
          currentGame = progress.current_game;
        });
      }
    }
  }
}
```

## Summary

The key is **sharing the same Supabase instance**. As long as:
- ✅ Both web and app use the same Supabase URL and anon key
- ✅ Both use the same authentication system
- ✅ Both save to the same database tables
- ✅ Both are properly authenticated

**Progress will sync automatically!** 🎉

The database acts as the single source of truth, and both platforms read from and write to it.

