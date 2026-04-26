---
story_id: '3.1'
story_key: '3-1-drag-to-place'
epic: 3
story_number: 1
title: 'Drag to Place'
status: 'ready-for-dev'
sprint: 3
priority: 1
estimated_hours: 5
created: '2026-04-26'
last_updated: '2026-04-26'
dependencies:
  - '2-1-play-song-snippet'
  - '2-2-sync-playback'
---

# Story 3.1: Drag to Place

## User Story

**As a** player,  
**I want** to drag a song card to my timeline,  
**So that** I can indicate where I think it belongs chronologically.

## Acceptance Criteria

**Given** I have heard the song snippet  
**When** I click/touch and drag the song card  
**Then** I can move it freely over my timeline  
**And** I see a visual indicator of where it will be placed

## Technical Requirements

### Timeline UI Component
- Vertical timeline display showing placed songs
- Empty timeline for first round
- Song cards draggable from a "current song" area
- Visual feedback during drag (elevation, shadow, opacity)

### Drag and Drop Implementation
- Support both mouse (desktop) and touch (mobile) drag
- Drag constraints: vertical movement within timeline bounds
- Smooth drag跟随 with no lag
- Drop zone highlighting when hovering over valid positions

### Visual Indicators
- Highlight insertion point with a line or glow effect
- Show existing songs shifting to make room for new song
- Preview the song card at drop position
- Timeline should show year markers (decade labels: 1960s, 1970s, etc.)

### Song Card Display
- Show current song title and artist (from Story 2.1)
- Card should be clearly distinguishable from placed songs
- Visual state: "unplaced" vs "placed"

### Responsive Design
- Timeline adapts to screen size
- Touch targets large enough for mobile (min 44px)
- Scrollable timeline when many songs are placed

## Architecture Compliance

### Database Schema
```sql
-- No new tables needed - uses existing game_states table from Story 1.3
-- Timeline data stored as JSONB in game_states.timeline:
-- [
--   { "song_id": "uuid", "position": 0, "release_year": 1985 },
--   { "song_id": "uuid", "position": 1, "release_year": 1992 }
-- ]
```

### State Management
- Local state for drag position during interaction
- Optimistic UI updates (no server round-trip during drag)
- State persisted on confirm (Story 3.3)

## File Structure Requirements

```
src/
├── components/
│   ├── GameScreen.jsx         # Main game screen
│   ├── Timeline.jsx           # NEW: Vertical timeline component
│   ├── SongCard.jsx           # NEW: Draggable song card
│   ├── DragPreview.jsx        # NEW: Drop zone indicator
│   └── YearMarkers.jsx        # NEW: Decade labels on timeline
├── lib/
│   └── supabase.js            # Supabase client
├── utils/
│   ├── gameService.js         # Game state operations
│   └── dragUtils.js           # NEW: Drag and drop utilities
└── pages/
    └── game.jsx               # Game page
```

## Testing Requirements

### Unit Tests
- Drag starts on mousedown/touchstart
- Drag position updates correctly during movement
- Drop zone detection works for all timeline positions
- Visual indicators show/hide correctly

### Integration Tests
- Song card can be dragged over timeline
- Insertion point highlights at correct position
- Existing songs shift to show placement preview
- Drag works on both desktop and mobile

### Manual Testing
1. Start a match and play a round (Stories 1.1-2.2)
2. After hearing the song, drag the song card
3. Verify visual feedback during drag
4. Verify insertion point highlighting
5. Test on both desktop (mouse) and mobile (touch)

## Implementation Notes

### MVP Simplification
- No animation during drag (performance)
- Simple linear timeline (no complex positioning)
- Basic visual feedback (color change, simple highlight)

### Performance Considerations
- Use CSS transforms for smooth drag
- Throttle position updates during drag
- Avoid re-renders of unchanged timeline items

### Accessibility
- Keyboard navigation alternative to drag
- ARIA labels for screen readers
- High contrast mode support

## Definition of Done

- [ ] Timeline component renders vertically
- [ ] Song card is draggable
- [ ] Drag works with mouse (desktop)
- [ ] Drag works with touch (mobile)
- [ ] Insertion point highlighting works
- [ ] Existing songs shift during drag
- [ ] Year markers displayed on timeline
- [ ] Responsive design works
- [ ] Unit tests passing
- [ ] Manual testing completed
- [ ] Code reviewed and merged

## Dependencies

- **Stories 2.1-2.2** - Song playback must be working
- Supabase project configured with game_states table

## Previous Story Learnings

From Epic 2 (Song Playback):
- Use the same Supabase client patterns
- Maintain consistent UI patterns from game screen
- Follow the same responsive design approach

## Next Story

After completing this story, proceed to **Story 3.2: Insert at Position** which handles inserting the song before, between, or after existing songs on the timeline.