# Debug: Moves Not Syncing - Console Checklist

When testing multiplayer, check these console messages in **BOTH** browsers:

## ✅ Expected Console Messages (Both Players)

### When Room is Created/Joined:
- [ ] `Setting up real-time subscriptions for room: [UUID]`
- [ ] `Move subscription status: SUBSCRIBED`
- [ ] `✅ Successfully subscribed to move changes for room: [UUID]`

### When Player Makes a Move:
**In the browser where the move is made:**
- [ ] `Sending move: {roomId, playerNumber, row, col}`
- [ ] `Move successfully inserted: [move data]`

**In the OTHER browser (should see):**
- [ ] `Move received via real-time: [payload]`
- [ ] `Move details: {movePlayerNumber, currentPlayerNumber, ...}`
- [ ] `Processing opponent move` (or `Ignoring own move`)
- [ ] `onMove callback triggered: [move]`

## 🔍 Diagnosis

### If you DON'T see "Successfully subscribed":
**Problem:** Real-time subscription failed
**Solution:** Enable real-time for `game_moves` table in Supabase Dashboard

### If you see "Sending move" but NO "Move received":
**Problem:** Real-time is not enabled OR subscription not working
**Solution:** 
1. Enable real-time for `game_moves` table
2. Check Network tab for WebSocket connections

### If you see "Move received" but NO "onMove callback triggered":
**Problem:** Handler not set or wrong player number
**Check:** 
- Is `onMove` handler set in MultiplayerGame component?
- Are player numbers correct (1 vs 2)?

### If you see "CHANNEL_ERROR":
**Problem:** Real-time not enabled or RLS blocking
**Solution:** Enable real-time and check RLS policies

## 🚀 Quick Test

1. Open game in two browsers
2. Open Console (F12) in both
3. Create/join room
4. **Check both consoles** for subscription messages
5. Make a move in Browser 1
6. **Check Browser 2 console** for "Move received" message

If Browser 2 doesn't see "Move received", real-time is not working.

