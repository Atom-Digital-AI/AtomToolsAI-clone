# UI Frozen State - 20 Hypotheses & Testing

## Problem Statement
User sees same topics/concepts every time, regardless of actual LLM responses. Regenerate button doesn't show anything new on screen.

## 20 Hypotheses (Ordered by Likelihood)

### 1. **React Query Cache Key Mismatch** [SCORE: 95/100] ⭐⭐⭐
**Theory**: The threadId variable used in the cache update doesn't match the threadId in the query key
**Evidence**: Lines 765, 975, 1207 - uses `statusData?.threadId || threadId` but might not match actual query key
**Test**: Check if activeThreadId in onSuccess matches the query key being updated

### 2. **React StrictMode Double Render** [SCORE: 85/100] ⭐⭐⭐
**Theory**: React 18 StrictMode causes double mounting, old data might be restored after update
**Evidence**: React 18's behavior in dev mode, common cause of cache issues
**Test**: Check if app wrapped in StrictMode, verify cache isn't rolled back

### 3. **Polling Overwrites Cache Update** [SCORE: 90/100] ⭐⭐⭐
**Theory**: The 5-second polling (line 328) refetches old data from server AFTER cache update
**Evidence**: Lines 1157-1163 invalidate + refetch, but polling might race
**Test**: Verify server returns new concepts, check timing of poll vs update

### 4. **Browser Cache / Service Worker** [SCORE: 75/100] ⭐⭐
**Theory**: Browser caching or service worker intercepting API calls with old responses
**Evidence**: Common PWA/caching issue
**Test**: Check Network tab for 304 responses, check if service worker active

### 5. **React Key Prop Not Changing** [SCORE: 70/100] ⭐⭐
**Theory**: concepts.map uses concept.id as key (line 1894), if IDs don't change, React won't re-render
**Evidence**: React optimization - same keys = no re-render
**Test**: Check if concept IDs change between regenerations

### 6. **Stale Closure in useEffect** [SCORE: 65/100] ⭐⭐
**Theory**: concepts variable in renderConceptsStage is a stale closure
**Evidence**: Lines 348-388 - useEffect logs concepts but might capture old value
**Test**: Check if concepts reference updates when cache changes

### 7. **QueryClient Instance Issues** [SCORE: 60/100] ⭐
**Theory**: Multiple QueryClient instances, updating wrong instance
**Evidence**: Line 44 imports queryClient
**Test**: Verify single QueryClient instance across app

### 8. **React Query Cache Time Too Long** [SCORE: 55/100] ⭐
**Theory**: staleTime or cacheTime prevents cache updates
**Evidence**: Default React Query behavior
**Test**: Check QueryClient config for staleTime/cacheTime

### 9. **Race Condition in Parallel Updates** [SCORE: 80/100] ⭐⭐⭐
**Theory**: Lines 1157-1163 do invalidate then refetch, race with concurrent poll
**Evidence**: Sequential async operations without await
**Test**: Check if invalidate completes before poll refetches

### 10. **Server Returns Cached Concepts** [SCORE: 50/100] ⭐
**Theory**: Server-side caching returns same concepts
**Evidence**: User says "regardless of what LLM returns" suggests UI issue not server
**Test**: Check server logs for different responses

### 11. **Optimistic Update Not Reverted** [SCORE: 45/100] ⭐
**Theory**: Line 839 clears concepts optimistically, never gets real data
**Evidence**: onMutate clears array, maybe onSuccess doesn't populate
**Test**: Check onSuccess actually receives new concepts

### 12. **ThreadId State Not Updating** [SCORE: 85/100] ⭐⭐⭐
**Theory**: threadId state variable (line 235) never updates, always queries old thread
**Evidence**: setThreadId only called on session creation, not on regenerate
**Test**: Check if threadId changes across regenerations

### 13. **SessionStorage/LocalStorage Interference** [SCORE: 40/100]
**Theory**: Browser storage caching old state
**Evidence**: Common issue with persistence layers
**Test**: Check localStorage/sessionStorage for cached data

### 14. **Memoization Preventing Re-render** [SCORE: 55/100] ⭐
**Theory**: useMemo or React.memo preventing concepts update
**Evidence**: No visible memoization in code but might be in parent
**Test**: Check for useMemo/React.memo in component tree

### 15. **Query Enabled Flag Issue** [SCORE: 50/100] ⭐
**Theory**: Line 313 `enabled: !!threadId` might disable query
**Evidence**: Query might not run if threadId falsy
**Test**: Verify threadId is truthy during regenerate

### 16. **React Hydration Mismatch** [SCORE: 30/100]
**Theory**: SSR hydration mismatch causes state reversion
**Evidence**: Not using SSR based on Vite setup
**Test**: N/A - not SSR app

### 17. **Concepts Array Reference Identity** [SCORE: 70/100] ⭐⭐
**Theory**: Line 340-342 creates new array but React doesn't detect change
**Evidence**: `threadState?.concepts || ...` might return same reference
**Test**: Check if concepts array reference changes

### 18. **Multiple Component Instances** [SCORE: 35/100]
**Theory**: Multiple instances of component rendered, seeing stale instance
**Evidence**: No evidence of this
**Test**: Check React DevTools for duplicate components

### 19. **Browser Extension Interference** [SCORE: 25/100]
**Theory**: Extension modifying API responses or cache
**Evidence**: Unlikely but possible
**Test**: Try in incognito mode

### 20. **Redux/Zustand State Manager Conflict** [SCORE: 20/100]
**Theory**: Another state manager interfering
**Evidence**: No evidence of Redux/Zustand in code
**Test**: Check for other state managers

## Top 3 Most Likely:
1. **Hypothesis #3 (90/100): Polling Overwrites Cache** - Refetch after invalidate races with poll
2. **Hypothesis #1 (95/100): Cache Key Mismatch** - activeThreadId doesn't match query key
3. **Hypothesis #12 (85/100): ThreadId Never Updates** - Always querying same thread

## Testing Plan:
Test in order: #1, #3, #12, #9, #2, #5, #17, #11, #15, #7
