---
story_id: '3.2'
story_key: '3-2-insert-at-position'
epic: 3
story_number: 2
title: 'Insert at Position'
status: 'ready-for-dev'
sprint: 3
priority: 2
estimated_hours: 4
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '3-1-drag-to-place'
---

# Story 3.2: Insert at Position

## User Story

**As a** player,  
**I want** to insert the song before, between, or after existing songs,  
**So that** I can build my chronological timeline.

## Acceptance Criteria

**Given** I am dragging a song card  
**When** I position it on the timeline  
**Then** the insertion point is highlighted  
**And** existing songs shift to show where the new song will go

## Technical Requirements

### Insertion Point Detection
- Detect when drag position is above, between, or below existing songs
- Show insertion line/glow at the correct position
- Support inserting at the top (before all songs)
- Support inserting at the bottom (after all songs)
- Support inserting between any two adjacent songs

### Visual Feedback
- Insertion line: horizontal line with glow effect at drop position
- Existing songs animate/slide to make room for new song
- Smooth transition when moving between insertion points
- Clear visual distinction between "above song X" and "below song X"

### Timeline Reordering
- When new song is inserted, recalculate positions for all subsequent songs
- Maintain relative order of existing songs
- Update position indices in local state
- Prepare data structure for persistence (Story 3.3)

### Drop Zone Logic
```javascript
// Pseudocode for insertion detection
function getInsertionIndex(dragY, songPositions) {
  for (let i = 0; i < songPositions.length; i++) {
    if (dragY < songPositions[i].centerY) {
      return i; // Insert before this song
    }
  }
  return songPositions.length; // Insert at end
}
```

### Edge Cases
- Empty timeline: allow placing anywhere
- Single song: allow before or after
- Many songs: smooth scrolling to follow drag
- Rapid movement: debounce insertion point changes

## Architecture Compliance

### State Management
- Local state tracks insertion index during drag
- Timeline positions stored as array: `[{song_id, position, release_year}]`
- Insertion updates position indices: `[0, 1, 2, new_at_3, 3→4, 4→5]`

### Data Structure
```javascript
// Timeline state structure
{
  timeline: [
    { song_id: "uuid-1", position: 0, release_year: 1980 },
    { song_id: "uuid-2", position: 1, release_year: 1985 },
    // New song will be inserted at position 2, shifting others
  ],
  currentSong: { song_id: "uuid-new", title: "...", artist: "..." }
}
```

## File Structure Requirements

```
src/
├── components/
│   ├── GameScreen.jsx         # Main game screen
│   ├── Timeline.jsx           # Vertical timeline (from 3.1)
│   ├── SongCard.jsx           # Draggable song card (from 3.1)
│   ├── InsertionIndicator.jsx # NEW: Insertion line/glow
│   └── TimelineReorder.jsx    # NEW: Handles reordering logic
├── lib/
│   └── supabase.js            # Supabase client
├── utils/
│   ├── gameService.js         # Game state operations
│   ├── dragUtils.js           # Drag and drop utilities (from 3.1)
│   └── timelineUtils.js       # NEW: Timeline position calculations
└── pages/
    └── game.jsx               # Game page
```

## Testing Requirements

### Unit Tests
- Insertion index calculated correctly for all positions
- Songs shift correctly when new song inserted
- Position indices updated correctly
- Edge cases handled (empty, single song, full timeline)

### Integration Tests
- Dragging over timeline shows insertion point
- Insertion point moves smoothly as drag moves
- Existing songs animate to make room
- Can insert at top, middle, and bottom

### Manual Testing
1. Start a match and play multiple rounds
2. Drag song card over timeline
3. Verify insertion point highlights correctly
4. Verify existing songs shift
5. Test inserting at various positions
6. Test with empty timeline and full timeline

## Implementation Notes

### MVP Simplification
- Simple linear insertion (no complex animations)
- Basic visual feedback (line highlight)
- Minimal animation for shifting songs

### Performance Considerations
- Throttle insertion point recalculation during drag
- Use CSS transforms for smooth shifting
- Avoid full re-renders when only position changes

### Accessibility
- Keyboard alternative for insertion (arrow keys to select position)
- ARIA live region announces insertion position
- Visual feedback sufficient for color-blind users

## Definition of Done

- [ ] Insertion point detection works for all positions
- [ ] Insertion line/glow displays correctly
- [ ] Existing songs shift to show placement
- [ ] Can insert at top, between, and at bottom
- [ ] Position indices update correctly
- [ ] Smooth visual transitions
- [ ] Edge cases handled (empty, single, many songs)
- [ ] Unit tests passing
- [ ] Manual testing completed
- [ ] Code reviewed and merged

## Dependencies

- **Story 3.1: Drag to Place** - Basic drag and timeline must be working

## Previous Story Learnings

From Story 3.1 (Drag to Place):
- Use the same drag and drop patterns
- Maintain consistent visual style
- Follow the same responsive design approach

## Next Story

After completing this story, proceed to **Story 3.3: Confirm Placement** which allows players to confirm or cancel their placement.