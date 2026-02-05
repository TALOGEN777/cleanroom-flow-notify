
## Fix Real-time Room Status Updates

The real-time subscription is set up correctly and the database table is properly configured for realtime updates. However, the current implementation is missing crucial error handling and connection status management that can cause silent failures.

### What's Wrong

The current code subscribes to real-time updates but:
1. Doesn't monitor if the subscription is actually connected
2. Has no fallback if the connection drops
3. Doesn't retry on errors

### Solution

I'll enhance the `useRooms` hook with a robust real-time subscription pattern:

1. **Add subscription status tracking** - Monitor the connection state (`SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`)

2. **Implement polling fallback** - If real-time fails or as a safety net, poll the database every 30 seconds to catch any missed updates

3. **Add auto-retry logic** - Automatically attempt to reconnect after connection failures

4. **Visual feedback** - Optionally add a connection status indicator so users know if they're receiving real-time updates

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useRooms.tsx` | Add subscription status handling, polling fallback, and retry logic |

---

### Technical Details

The enhanced subscription will:

```text
┌──────────────────────────────────────────────────────────────┐
│                    Real-time Subscription                    │
├──────────────────────────────────────────────────────────────┤
│  1. Subscribe to 'postgres_changes' on 'rooms' table         │
│  2. Track subscription status (SUBSCRIBED, ERROR, etc.)      │
│  3. On successful subscription → stop fallback polling       │
│  4. On error/timeout → start fallback polling + retry        │
│  5. Polling fetches rooms updated since last sync            │
│  6. Clean up on unmount                                      │
└──────────────────────────────────────────────────────────────┘
```

Key code changes:
- Add `.subscribe((status) => { ... })` callback to track connection state
- Add `useRef` for polling interval and retry timeout
- Add `lastSyncTimestamp` to track when we last received an update
- Implement exponential backoff for polling (start at 5s, max 30s)
- Clean up all intervals/timeouts on unmount
