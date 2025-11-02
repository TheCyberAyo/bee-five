# Fix: Moves Not Syncing Between Players

If moves from one player don't appear on the other player's screen, the issue is likely that **Real-time is not enabled** for the `game_moves` table in Supabase.

## ✅ Quick Fix

### Option 1: Enable via Supabase Dashboard (Easiest)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Database** → **Replication** (or **Table Editor**)
4. Find the `game_moves` table
5. **Toggle ON the "Realtime" switch** for `game_moves`
6. ✅ That's it! Moves should now sync in real-time

### Option 2: Enable via SQL Editor

1. Go to **SQL Editor** in Supabase Dashboard
2. Click "New query"
3. Run this SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE game_moves;
```

4. Click "Run"

## 🔍 Verify It's Working

After enabling real-time, test again:

1. Open your game in **two different browsers** (or incognito windows)
2. Create/join a room
3. Make a move in one browser
4. **Check the browser console** (F12) in the other browser
5. You should see:
   - `✅ Successfully subscribed to move changes`
   - `Move received via real-time:` (when a move happens)
   - `onMove callback triggered:`

If you see these logs, real-time is working! If not, check the troubleshooting section below.

## 🐛 Troubleshooting

### Issue: Still not seeing moves sync

**Check 1: Browser Console**
- Open both browsers' console (F12)
- Look for subscription status messages
- Look for "Move received" messages
- If you see "CHANNEL_ERROR", real-time isn't enabled

**Check 2: Supabase Dashboard**
- Go to Database → Replication
- Verify `game_moves` shows "Realtime: ON"
- If it's OFF, enable it (see above)

**Check 3: Network Tab**
- Open browser DevTools → Network tab
- Filter by "realtime" or "websocket"
- You should see WebSocket connections to Supabase
- If not, real-time isn't connecting

### Issue: Console shows "CHANNEL_ERROR"

This means the subscription failed. Common causes:
1. ✅ Real-time not enabled for `game_moves` table
2. ✅ RLS policies blocking real-time
3. ✅ Network/firewall blocking WebSocket connections

**Fix:** Enable real-time for `game_moves` (see above)

### Issue: Console shows "Move received" but nothing happens on screen

This means real-time is working, but the UI isn't updating. Check:
1. ✅ `onMove` handler is set (check console logs)
2. ✅ The move is being processed (check "Processing opponent move" log)
3. ✅ Browser console for any JavaScript errors

## 📊 Debug Checklist

Use this to diagnose the issue:

- [ ] Real-time is enabled for `game_moves` table (Database → Replication)
- [ ] Browser console shows "✅ Successfully subscribed to move changes"
- [ ] Browser console shows "Move received via real-time" when opponent moves
- [ ] Browser console shows "onMove callback triggered" when move received
- [ ] Network tab shows WebSocket connections to Supabase
- [ ] No errors in browser console
- [ ] Both players are in the same room

## 🚀 Enable Real-time for All Tables (Recommended)

To ensure everything works smoothly, enable real-time for all game tables:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
```

Run this in Supabase SQL Editor to enable all tables at once.

---

## Still Not Working?

If you've enabled real-time and it's still not working:

1. **Check the browser console logs** - they'll tell you exactly what's happening
2. **Verify both players see "Successfully subscribed"** message
3. **Check Network tab** for WebSocket connections
4. **Try refreshing both browsers** after enabling real-time

The console logs I added will help identify exactly where the problem is!

