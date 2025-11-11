# Bee-Five Scalability Analysis

This document outlines the scalability limits of the Bee-Five project based on the current Supabase setup and multiplayer architecture.

## 📊 Supabase Free Tier Limits

### Authentication (User Management)
- **Monthly Active Users (MAUs):** 50,000 users
  - This means up to 50,000 unique users can sign in per month
  - Perfect for authentication, profile management, and progress tracking

### Real-Time (Multiplayer Component)
- **Concurrent Real-Time Connections:** 200 connections
  - This is the **primary bottleneck** for multiplayer functionality
  - Each active multiplayer session consumes multiple connections

- **Real-Time Messages:** 2 million messages per month
  - Game moves, state updates, and player events count toward this limit
  - Your current configuration: 10 events per second per connection

### Database
- **Storage:** 500 MB
- **Bandwidth:** 2 GB per month
- **Database Connections:** Limited by Supabase (typically ~60 connections on free tier)

---

## 🎮 Multiplayer Architecture Analysis

### Connection Usage Per Multiplayer Game

Each multiplayer game requires:

1. **Per Player (4 subscriptions):**
   - `room:${roomId}` - Room status updates
   - `players:${roomId}` - Player join/leave events
   - `moves:${roomId}` - Game move synchronization
   - `game_state:${roomId}` - Game state updates (board, current player, winner)

2. **Total per Game:**
   - 2 players × 4 subscriptions = **8 real-time connections per active game**

### Current Capacity Calculations

**Maximum Concurrent Multiplayer Games:**
```
200 connections ÷ 8 connections/game = 25 concurrent games
```

**Maximum Concurrent Multiplayer Players:**
```
25 games × 2 players/game = 50 concurrent multiplayer players
```

**Maximum Monthly Active Users (Authentication):**
```
50,000 users (can sign in and use single-player features)
```

---

## 📈 Scaling Scenarios

### Scenario 1: Free Tier (Current Setup)
- ✅ **Single-player games:** Unlimited (within 50,000 MAU limit)
- ✅ **Progress tracking:** Up to 50,000 users
- ⚠️ **Concurrent multiplayer games:** 25 games (50 players)
- ⚠️ **Multiplayer capacity:** Limited by 200 real-time connections

### Scenario 2: Mixed Usage (Realistic)
Assuming:
- 10% of users play multiplayer simultaneously
- Average game duration: 10 minutes
- Players rotate in/out

**Estimated capacity:**
- **Concurrent multiplayer players:** ~50 players
- **Peak multiplayer sessions per hour:** ~300 games (50 players × 6 games/hour)
- **Daily multiplayer sessions:** ~7,200 games
- **Monthly multiplayer sessions:** ~216,000 games (well within 2M message limit)

### Scenario 3: Message Limit Check
**Per game estimate:**
- Average moves per game: ~50 moves
- State updates: ~20 updates
- Room/player events: ~5 events
- **Total: ~75 messages per game**

**Monthly capacity:**
```
2,000,000 messages ÷ 75 messages/game = ~26,666 games/month
```

---

## ⚠️ Bottlenecks & Limitations

### Primary Bottleneck: Real-Time Connections
- **Limit:** 200 concurrent connections
- **Impact:** Only 25 concurrent multiplayer games possible
- **Workaround:** Players must wait if all connections are in use

### Secondary Considerations
1. **Message Rate:** 10 events/second per connection (configured in `supabase.ts`)
   - Current setting is conservative and safe
   - Can handle rapid gameplay without issues

2. **Database Storage:** 500 MB
   - Game moves, states, and rooms accumulate over time
   - **Recommendation:** Implement cleanup of old/finished games

3. **Bandwidth:** 2 GB/month
   - Real-time messages are lightweight
   - Should be sufficient for moderate usage

---

## 🚀 Scaling Options

### Option 1: Upgrade to Supabase Pro Plan ($25/month)
**New Limits:**
- **Concurrent Real-Time Connections:** 500 connections
  - **New capacity:** 62 concurrent games (125 players)
- **Real-Time Messages:** 5 million/month
- **Database Storage:** 8 GB
- **Bandwidth:** 50 GB/month
- **MAUs:** 100,000 users

### Option 2: Optimize Connection Usage (Free Tier)
**Potential optimizations:**
1. **Reduce subscriptions per game:**
   - Combine room and player updates into one channel
   - Reduce from 8 to 4-6 connections per game
   - **Result:** 33-50 concurrent games (66-100 players)

2. **Implement connection pooling:**
   - Reuse connections for multiple rooms
   - More complex but increases efficiency

3. **Add cleanup mechanisms:**
   - Automatically close finished games
   - Clean up old game data regularly
   - Prevent connection leaks

### Option 3: Hybrid Architecture
- Use Supabase for authentication and progress tracking
- Use WebSockets or other real-time service for multiplayer
- Reduces load on Supabase real-time connections

---

## 💡 Recommendations

### For Current Setup (Free Tier)
1. **Monitor connection usage:**
   - Track active multiplayer games
   - Alert users when approaching capacity
   - Show "waiting room" if all games are full

2. **Implement game cleanup:**
   - Auto-delete finished games after 24 hours
   - Clean up abandoned games (no activity for 30 minutes)
   - Prevent database bloat

3. **Add connection management:**
   - Gracefully handle connection limits
   - Provide user feedback when capacity is reached
   - Queue system for waiting players

4. **Optimize message usage:**
   - Batch state updates when possible
   - Reduce unnecessary real-time events
   - Current 10 events/second is reasonable

### For Growth
1. **Upgrade to Pro Plan** when you exceed:
   - 25 concurrent multiplayer games regularly
   - 50,000 monthly active users
   - 2 million real-time messages/month

2. **Consider alternative architecture** if you need:
   - Hundreds of concurrent games
   - Lower latency requirements
   - More control over real-time infrastructure

---

## 📊 Summary Table

| Metric | Free Tier | Pro Tier | Current Usage |
|--------|-----------|----------|---------------|
| **Monthly Active Users** | 50,000 | 100,000 | Unknown |
| **Concurrent Real-Time Connections** | 200 | 500 | 8 per game |
| **Max Concurrent Multiplayer Games** | 25 | 62 | Depends on usage |
| **Max Concurrent Multiplayer Players** | 50 | 125 | Depends on usage |
| **Real-Time Messages/Month** | 2M | 5M | ~75 per game |
| **Database Storage** | 500 MB | 8 GB | Monitor usage |
| **Bandwidth/Month** | 2 GB | 50 GB | Monitor usage |

---

## 🔍 Monitoring & Alerts

### Key Metrics to Track
1. **Active real-time connections**
2. **Concurrent multiplayer games**
3. **Real-time message rate**
4. **Database storage usage**
5. **Bandwidth consumption**

### Recommended Alerts
- Alert at 80% of connection limit (160 connections)
- Alert at 80% of message limit (1.6M messages)
- Alert at 80% of storage limit (400 MB)
- Alert at 80% of bandwidth limit (1.6 GB)

---

## 📝 Conclusion

**Current Capacity (Free Tier):**
- ✅ **Single-player:** Up to 50,000 monthly active users
- ✅ **Multiplayer:** Up to 25 concurrent games (50 players)
- ⚠️ **Limitation:** Real-time connection limit is the main constraint

**Recommendation:**
- The free tier is sufficient for **development and small-scale deployment**
- For **production with moderate traffic**, consider upgrading to Pro Plan
- For **large-scale deployment**, consider alternative architectures or Enterprise plan

**Next Steps:**
1. Monitor actual usage patterns
2. Implement cleanup mechanisms for old games
3. Add connection limit handling in the UI
4. Plan for upgrade when approaching limits

