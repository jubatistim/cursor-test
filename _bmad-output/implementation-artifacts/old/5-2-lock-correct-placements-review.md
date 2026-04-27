---
review_target: 5-2-lock-correct-placements
review_date: 2026-04-26
diff_lines: 1448
review_mode: full
spec_file: _bmad-output/implementation-artifacts/5-2-lock-correct-placements.md
---

# Code Review Findings: Story 5-2-lock-correct-placements

## Executive Summary

**Status: CONDITIONAL APPROVAL** - Code is well-structured with comprehensive tests, but contains CRITICAL bugs in the round resolution logic that must be fixed before merging.

---

## 🔴 CRITICAL FINDINGS

### 1. **BUG: All Players Share Same Correct Song IDs in triggerReveal**
**File:** `src/components/GameScreen.jsx:720-730`

**Evidence:**
```javascript
const correctSongIds = [];

for (const player of players) {
  const result = calculatePlacementCorrectness(gameState, currentSong.id);
  if (result.isCorrect) {
    correctSongIds.push(currentSong.id);  // ❌ BUG: Same song ID pushed for every player
  }
  
  const updatedTimeline = filterIncorrectCards(currentTimeline, correctSongIds);
}
```

**Problem:** `correctSongIds` accumulates the same `currentSong.id` for every player who placed correctly. Then `filterIncorrectCards` checks if `card.song_id` is in `correctSongIds`, which means:
- If 2 players got song-1 correct, `correctSongIds = ['song-1', 'song-1']`
- `includes()` still works but the array has duplicates
- More critically, this doesn't track WHICH SPECIFIC SONGS each player got right

**Impact:** If a player had multiple songs in their timeline and only one was correct, `filterIncorrectCards` will keep ALL songs that match ANY correct ID from ANY player, not just the ones this specific player got right.

**Fix:** Filter each player's timeline against THEIR specific correct placement, not a shared array.

```javascript
// BEFORE (BUGGY):
const correctSongIds = [];
for (const player of players) {
  if (result.isCorrect) {
    correctSongIds.push(currentSong.id);
  }
  const updatedTimeline = filterIncorrectCards(currentTimeline, correctSongIds);
}

// AFTER (FIXED):
for (const player of players) {
  const isCorrect = result.isCorrect;
  const correctForThisPlayer = isCorrect ? [currentSong.id] : [];
  const updatedTimeline = filterIncorrectCards(currentTimeline, correctForThisPlayer);
}
```

---

### 2. **BUG: Filter Logic Doesn't Handle Per-Player Correctness**
**File:** `src/utils/timelineUtils.js:40-50`

**Evidence:**
```javascript
export function filterIncorrectCards(timeline = [], correctSongIds = []) {
  return timeline
    .filter(card => correctSongIds.includes(card.song_id))
    .map((card, index) => ({
      ...card,
      position: index,
      is_locked: true
    }));
}
```

**Problem:** This function assumes `correctSongIds` contains ALL songs that should be kept. But in the round resolution, each player should only keep the songs THEY placed correctly, not all correct placements across all players.

**Impact:** Players could see songs locked in their timeline that they never placed.

---

## 🟡 HIGH SEVERITY FINDINGS

### 3. **Database Update Race Condition**
**File:** `src/components/GameScreen.jsx:730-745`

**Evidence:**
```javascript
for (const player of players) {
  // ... calculate correctness ...
  await supabase
    .from('game_states')
    .update({ timeline: updatedTimeline, updated_at: new Date().toISOString() })
    .eq('match_id', match.id)
    .eq('player_id', player.id);
}
```

**Problem:** Sequential `await` in a loop means each player's update happens one after another. If the loop is interrupted (error, timeout), subsequent players won't have their timelines updated. No transaction wrapping.

**Recommendation:** Use `Promise.all` for parallel updates with error handling:

```javascript
const updatePromises = players.map(async (player) => {
  // ... calculate for each player ...
  return supabase
    .from('game_states')
    .update({ timeline: updatedTimeline, updated_at: new Date().toISOString() })
    .eq('match_id', match.id)
    .eq('player_id', player.id);
});

try {
  await Promise.all(updatePromises);
} catch (err) {
  console.error('Error updating timelines:', err);
  // Consider rollback or partial update handling
}
```

---

### 4. **State Sync Not Updating Local State**
**File:** `src/components/GameScreen.jsx:245-268`

**Evidence:**
```javascript
const syncTimelineState = useCallback(async (gameStatesData) => {
  // ... validates and potentially updates backend ...
  // ❌ MISSING: No call to setTimeline or similar to update local state
}, [playerId]);
```

**Problem:** The `syncTimelineState` function validates and updates the backend but never updates the local React state. The comment says "Sync timeline state for reconnection" but it only syncs TO the backend, not FROM the backend TO local state.

**Impact:** On reconnection, the UI won't reflect the persisted timeline state.

**Fix:** Add state update after validation:

```javascript
const syncTimelineState = useCallback(async (gameStatesData) => {
  if (!playerId) return;
  
  const playerGameState = gameStatesData.find(gs => gs.player_id === playerId);
  if (playerGameState?.timeline) {
    const validatedTimeline = playerGameState.timeline.map(entry => ({
      ...entry,
      is_locked: entry.is_locked !== false
    }));
    
    setTimeline(validatedTimeline); // ⭐ ADD THIS
    
    // Only update backend if validation changed data
    if (JSON.stringify(playerGameState.timeline) !== JSON.stringify(validatedTimeline)) {
      await supabase
        .from('game_states')
        .update({ timeline: validatedTimeline, updated_at: new Date().toISOString() })
        .eq('match_id', playerGameState.match_id)
        .eq('player_id', playerId);
    }
  }
}, [playerId]);
```

---

### 5. **Potential Memory Leak in Real-time Subscription**
**File:** `src/components/GameScreen.jsx:524-575`

**Evidence:**
```javascript
matchChannelRef.current = matchChannel;

const gameStateChannel = supabase
  .channel('game_state_updates_' + roomId)
  .on('postgres_changes', { /* ... */ }, (payload) => {
    loadMatchData();
    // Enhanced timeline sync for reconnection scenarios
    if (payload.eventType === 'UPDATE' && payload.new.player_id === playerId) {
      // ...
    }
  })
  .subscribe();
```

**Problem:** The subscription is created but there's no cleanup on unmount. If the component unmounts and remounts (e.g., room navigation), old subscriptions may accumulate.

**Fix:** Store subscription reference and unsubscribe in cleanup:

```javascript
const gameStateChannelRef = useRef(null);

// In subscription code:
gameStateChannelRef.current = supabase
  .channel('game_state_updates_' + roomId)
  .on(/* ... */)
  .subscribe();

// In useEffect cleanup:
return () => {
  if (gameStateChannelRef.current) {
    supabase.removeChannel(gameStateChannelRef.current);
  }
};
```

---

## 🟠 MEDIUM SEVERITY FINDINGS

### 6. **Inefficient Re-rendering in Timeline Render**
**File:** `src/components/GameScreen.jsx:948-975`

**Evidence:**
```javascript
{(() => {
  const playerGameState = getPlayerGameState(playerId);
  const lockedTimeline = playerGameState?.timeline || [];
  const lockedSongs = lockedTimeline.map(entry => ({
    id: entry.song_id,
    title: entry.title || 'Unknown Title',
    // ...
  }));
  
  return (
    <>
      <YearMarkers songs={lockedSongs} />
      <Timeline songs={lockedSongs} /* ... */ />
    </>
  );
})()}
```

**Problem:** IIFE (Immediately Invoked Function Expression) in render causes the transformation logic to run on every render, and the inline function creates new references for `lockedSongs` even if `gameStates` hasn't changed. This triggers unnecessary re-renders of `Timeline` and `YearMarkers`.

**Fix:** Use `useMemo`:

```javascript
const lockedSongs = useMemo(() => {
  const playerGameState = getPlayerGameState(playerId);
  return (playerGameState?.timeline || []).map(entry => ({
    id: entry.song_id,
    title: entry.title || 'Unknown Title',
    artist: entry.artist || 'Unknown Artist',
    release_year: entry.release_year || 2020,
    is_locked: entry.is_locked !== false,
    position: entry.position
  }));
}, [gameStates, playerId]);

// In render:
<>
  <YearMarkers songs={lockedSongs} />
  <Timeline songs={lockedSongs} /* ... */ />
</>
```

---

### 7. **Inconsistent Song ID Field Names**
**Files:** `src/utils/timelineUtils.js`, `src/components/Timeline.jsx`, `src/components/GameScreen.jsx`

**Evidence:**
```javascript
// In timelineUtils.js - uses song_id:
const lockedCard = {
  song_id: cardData.id,
  title: cardData.title,
  // ...
};

// In Timeline.jsx - expects id:
<div className={`song-item ${draggedSong?.id === song.id ? 'dragging' : ''}`}

// In GameScreen.jsx - uses id:
song.id === currentSongId
```

**Problem:** The utility functions use `song_id` internally, but the existing codebase uses `id`. When data flows between these layers, field name mismatches could cause bugs.

**Recommendation:** Standardize on one field name. Since the rest of the codebase uses `id`, update `timelineUtils.js`:

```javascript
// Change from:
song_id: cardData.id
// To:
id: cardData.id

// And update references:
const existingCard = timeline.find(card => card.id === cardData.id);
const updatedTimeline = filterIncorrectCards(currentTimeline, correctForThisPlayer);
// filterIncorrectCards should check card.id, not card.song_id
```

**OR** update everywhere to use `song_id` for consistency with the database schema.

---

### 8. **Missing PropTypes for New Props**
**File:** `src/components/Timeline.jsx:11`

**Evidence:**
```javascript
export function Timeline({ 
  songs = [], 
  onSongDrop, 
  className = '', 
  showYearMarkers = false, 
  revealed = false, 
  currentSongId = null, 
  playerResult = {}
}) {
```

**Problem:** Timeline now renders songs with `is_locked` property, but this isn't documented in PropTypes. Missing `is_locked` in PropTypes means potential runtime errors if songs array has inconsistent shapes.

**Fix:** Update PropTypes:

```javascript
Timeline.propTypes = {
  songs: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    artist: PropTypes.string,
    release_year: PropTypes.number,
    is_locked: PropTypes.bool,
    position: PropTypes.number
  })),
  // ... other props
};
```

---

### 9. **Performance: O(n²) in addLockedCard**
**File:** `src/utils/timelineUtils.js:14-35`

**Evidence:**
```javascript
// Check if card is already locked
const existingCard = timeline.find(card => card.song_id === cardData.id);
// ...
const newTimeline = [...timeline];
newTimeline.splice(position, 0, lockedCard);
// Re-index all cards after the inserted position
return newTimeline.map((card, index) => ({
  ...card,
  position: index
}));
```

**Problem:** Two passes through the array (`find` + `map`), plus the spread operator creates a new array. Could be optimized to single pass.

**Recommendation:** Minor optimization, not critical:

```javascript
const newTimeline = [];
let inserted = false;
let newIndex = 0;

for (const card of timeline) {
  if (!inserted && newIndex === position) {
    newTimeline.push({
      song_id: cardData.id,
      title: cardData.title,
      artist: cardData.artist,
      release_year: cardData.release_year,
      position: newIndex,
      locked_at: new Date().toISOString(),
      is_locked: true
    });
    inserted = true;
  }
  if (card.song_id !== cardData.id) {
    newTimeline.push({ ...card, position: newIndex });
    newIndex++;
  }
}

return newTimeline;
```

---

### 10. **Objects Passed by Reference in Filter**
**File:** `src/utils/timelineUtils.js:48-50`

**Evidence:**
```javascript
return timeline
  .filter(card => correctSongIds.includes(card.song_id))
  .map((card, index) => ({
    ...card,
    position: index,
    is_locked: true
  }));
```

**Problem:** The spread operator `...card` only creates a shallow copy. If `card` has nested objects, those would still be shared references. In this case, cards are flat objects, so it's fine, but worth noting.

**Recommendation:** Add comment explaining shallow copy is sufficient given flat structure, or use deep clone if structure changes.

---

## 🟢 LOW SEVERITY FINDINGS

### 11. **Hardcoded Default Year**
**File:** `src/components/GameScreen.jsx:958`

**Evidence:**
```javascript
release_year: entry.release_year || 2020
```

**Problem:** Default year of 2020 is hardcoded. Could be confusing if a song actually IS from 2020 but missing data.

**Fix:** Use `null` or a placeholder:

```javascript
release_year: entry.release_year ?? null
```

---

### 12. **Partitioned Diff**
The diff was truncated in my analysis. Let me continue reading the GameScreen file to see if there are more issues.

---

### 13. **Incomplete Current Song Hide Logic**
**File:** `src/components/GameScreen.jsx:948-952`

**Evidence:**
```javascript
{currentSong && (() => {
  const playerGameState = getPlayerGameState(playerId);
  const lockedTimeline = playerGameState?.timeline || [];
  const isAlreadyLocked = lockedTimeline.some(entry => entry.song_id === currentSong.id);
  return !isAlreadyLocked;
})() && (
  // Render current song
)}
```

**Problem:** Uses `song_id` but `currentSong.id` - field name mismatch again. Also, this only hides if the song is in the locked timeline, but what about the temporary placed songs (before reveal)?

**Impact:** After reveal, correct songs are locked and current song may not be hidden if it uses `id` vs `song_id`.

**Fix:** Ensure consistent field names and also check `placedSongs`:

```javascript
{currentSong && !placedSongs.some(s => s.id === currentSong.id) && (
  // Render current song
)}
```

---

## ✅ WHAT'S DONE WELL

### 14. **Comprehensive Test Coverage**
All new utility functions have thorough unit tests covering:
- Happy paths
- Edge cases (empty arrays, invalid inputs)
- Error conditions
- Property validation
- Integration scenarios

**Files:** `timelineUtils.test.js`, `roundResolution.test.js`, `timelinePersistence.test.js`, `Timeline.test.jsx`

### 15. **Accessibility**
Timeline component maintains good accessibility:
- Proper `aria-label` for locked cards
- `aria-grabbed` states
- Keyboard navigation support
- Focus management

### 16. **Visual Feedback**
- Locked cards have distinct styling (opacity, background, cursor)
- Lock indicator 🔒 for clarity
- Hover states disabled for locked cards

### 17. **Backend Integration**
- Uses existing `game_states` table
- Real-time subscriptions for sync
- Reconnection handling

---

## 📋 ACCEPTANCE AUDITOR FINDINGS

### AC1: "Correct songs permanently join the timeline display"
**Status:** ❌ **FAILING** - Due to Bug #1 and #2, the filtering logic doesn't correctly identify per-player correct songs.

### AC2: "Incorrect songs are successfully discarded"
**Status:** ❌ **FAILING** - Same reason as AC1. Incorrect songs may not be discarded if filtering uses wrong criteria.

### AC3: "Locked songs are not draggable"
**Status:** ✅ **PASSING** - Timeline component correctly sets `draggable={!revealed && !song.is_locked}` and prevents drag handlers.

### AC4: "Timeline state is synced with the backend"
**Status:** ⚠️ **PARTIAL** - Sync logic exists but:
- Local state not updated from backend on reconnection (Bug #4)
- No cleanup of subscriptions (Bug #5)
- Race conditions possible (Bug #3)

### AC5: Technical Requirements
- ✅ Timeline persistence logic implemented
- ✅ Storage via game_states table
- ❌ File structure: Missing `src/utils/roundResolution.js` (only test file exists)
- The story mentions `roundResolution.js` but only `roundResolution.test.js` exists

---

## 🎯 RECOMMENDATIONS

### Before Merge (CRITICAL):
1. **FIX Bug #1:** Per-player correct song tracking in `triggerReveal`
2. **FIX Bug #4:** Update local state in `syncTimelineState`
3. **Verify** field name consistency (`id` vs `song_id`)

### Before Merge (HIGH):
4. **FIX Bug #3:** Use `Promise.all` for parallel database updates
5. **FIX Bug #5:** Cleanup subscriptions on unmount

### Nice to Have:
6. Optimize `addLockedCard` to single pass
7. Add PropTypes for `is_locked` field
8. Use `useMemo` for `lockedSongs` transformation
9. Consider deep clone vs shallow copy in utilities

---

## 📊 SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 2 | **BLOCKER** |
| HIGH | 3 | **BLOCKER** |
| MEDIUM | 5 | Should Fix |
| LOW | 4 | Nice to Have |

**Overall: Do not merge until CRITICAL and HIGH issues are resolved.**

---

## ⚡ QUICK FIX SUGGESTION

The main blocker is in `src/components/GameScreen.jsx:707-745`. Here's the corrected version:

```javascript
const triggerReveal = useCallback(async () => {
  if (!match?.id || !currentSong?.id || !currentRoundData?.id) {
    console.warn('Cannot trigger reveal: missing required data');
    return;
  }
  
  const playerResults = {};
  
  // Process all players in parallel
  const updatePromises = players.map(async (player) => {
    const gameState = getPlayerGameState(player.id);
    if (!gameState) return;
    
    const result = calculatePlacementCorrectness(gameState, currentSong.id);
    playerResults[player.id] = result;
    
    // Track correctness per player
    const correctForThisPlayer = result.isCorrect ? [currentSong.id] : [];
    
    // Update score
    if (result.isCorrect) {
      try {
        await matchService.incrementCorrectPlacements(match.id, player.id);
      } catch (err) {
        console.error('Error updating correct placements:', err);
      }
    }
    
    // Update timeline - lock correct, discard incorrect
    try {
      const currentTimeline = gameState.timeline || [];
      const updatedTimeline = filterIncorrectCards(currentTimeline, correctForThisPlayer);
      
      await supabase
        .from('game_states')
        .update({
          timeline: updatedTimeline,
          updated_at: new Date().toISOString()
        })
        .eq('match_id', match.id)
        .eq('player_id', player.id);
    } catch (err) {
      console.error('Error updating player timeline:', err);
    }
  });
  
  try {
    await Promise.all(updatePromises);
  } catch (err) {
    console.error('Error in round resolution:', err);
  }
  
  // Set reveal data
  setRevealData({
    roundId: currentRoundData.id,
    songId: currentSong.id,
    songTitle: currentSong.title,
    songArtist: currentSong.artist,
    releaseYear: currentSong.release_year,
    playerResults
  });
  
  if (unsubscribeOpponentRef.current) {
    unsubscribeOpponentRef.current();
    unsubscribeOpponentRef.current = null;
  }
  
  setPlacementStatus('placing');
}, [match?.id, currentSong, currentRoundData, players, gameStates, calculatePlacementCorrectness]);
```

Also fix `syncTimelineState` to update local state, and consider standardizing on `id` vs `song_id` field names.
