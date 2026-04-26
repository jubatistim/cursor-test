---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - /media/juliano-batistim/DATA-EMPIRE1/dev/cursor-test/_bmad-output/game-brief.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
workflowType: 'gdd'
lastStep: 6
project_name: 'cursor-test'
user_name: 'Ju'
date: '2026-04-25T20:02:38-03:00'
game_type: 'party-game'
game_name: 'Hitster Web'
---

# Hitster Web - Game Design Document

**Author:** Ju
**Game Type:** party-game
**Target Platform(s):** Web browser (desktop + mobile responsive)

---

## Executive Summary

### Core Concept

Hitster Web is a web-native party game where players join a shared room and compete by placing songs in chronological order on personal timelines. The core interaction is quick and social: hear a track, decide where it belongs in history, reveal correctness, and build momentum toward victory.

The MVP is intentionally focused on a 2-player flow for reliability and fast iteration. It combines nostalgic classics and modern tracks, aiming to create an energetic experience that is easy to start and replay with family and friends in either local or remote settings.

### Target Audience

Casual players aged 10+ in family and friend groups, playing in short social sessions either locally or remotely.

### Unique Selling Points (USPs)

- Instant room-code access from browser with no physical setup
- Hybrid local and remote play in the same match flow
- Timeline-based music challenge blending nostalgic and modern songs

---

## Goals and Context

### Project Goals

1. **Ship a stable, fun 2-player web MVP for family/friends**  
   Deliver a complete playable loop that is reliable in real social sessions.

2. **Deliver low-friction room-based multiplayer**  
   Make room creation/join flow fast and clear, with minimal setup overhead.

3. **Validate replayability and social fun through playtests**  
   Use real family/friend sessions to confirm that rounds feel engaging and repeatable.

4. **Maintain strict MVP control with TDD discipline**  
   Prioritize core gameplay stability over feature expansion and protect behavior with tests.

### Background and Rationale

Hitster Web is being built to bring the core Hitster-style mechanic into a private web experience for family and friends. This project exists to remove physical setup friction and enable instant room-code sessions for both local and remote play.

The timing is practical: modern web tooling and managed services (Netlify, Supabase, Cloudinary) allow rapid implementation and iteration by a solo developer. The guiding philosophy is gameplay-first execution: prioritize flow, clarity, and social fun over commercial scope or unnecessary complexity.

---

## Unique Selling Points (USPs)

1. **Browser-first room-code multiplayer**  
   Instant access and match entry without physical components or installation barriers.

2. **Hybrid local/remote social model**  
   The same game flow supports players in one physical space or distributed remotely.

3. **Cross-generation music timeline challenge**  
   Core mechanic blends nostalgic and modern tracks in a single chronological placement format.

4. **Lean reliability-first MVP approach**  
   Solo-built with deliberate scope control and TDD, emphasizing stable replayable sessions over feature bloat.

### Competitive Positioning

Hitster Web positions itself as a lightweight, private, web-native alternative to physical music party play, focused on fast setup and practical social usability. Its differentiation is not "more features," but lower friction, broader session flexibility (local + remote), and a tightly scoped, dependable gameplay loop.

---

## Target Platform(s)

### Primary Platform

Web browser (desktop and mobile-responsive).

### Platform Considerations

- Web-only scope for current GDD and MVP
- Prioritize low-friction access: create/join room by code with minimal setup
- Optimize for responsive layout and reliable interaction across common modern browsers
- Performance goal is smooth, responsive UI and stable game flow rather than strict graphics-heavy targets
- No additional platform-specific features (e.g., PWA, achievements, cloud save layer) required for MVP

### Control Scheme

- Desktop: mouse-first interactions for room flow and timeline placement
- Mobile: touch-first interactions with vertical timeline placement optimized for small screens
- Input model should remain simple and consistent between desktop and mobile

---

## Target Audience

### Demographics

Casual players aged 10+ in family and friend groups, playing either co-located or remotely in shared private rooms.

### Gaming Experience

Casual — the game should be understandable without prior competitive or genre-specific expertise.

### Genre Familiarity

No prior music game or party game familiarity required. Rules and flow should teach themselves through play.

### Session Length

Short social sessions, with quick round cadence and replay-friendly match structure.

### Player Motivations

- Have fun together with minimal setup
- Enjoy nostalgia and modern music recognition moments
- Compete in a friendly, low-pressure social format

---

## Core Gameplay

### Game Pillars

1. **Instant Social Fun**
   Quick setup with minimal friction before gameplay begins. Players should be able to start a match within 2 minutes of opening the browser.

2. **Music Memory Challenge**
   The central skill is recognizing songs and placing them in the correct chronological order. Rewards both deep musical knowledge and intuitive era recognition.

3. **Fair, Fast Rounds**
   Each turn completes quickly with clear rules and consistent outcomes. No player should wait excessively for others, and results are immediately understandable.

4. **Easy Room-Based Multiplayer**
   Players create or join rooms via simple code entry. Supports both co-located and remote players in the same session without additional setup complexity.

**Pillar Priority:** When pillars conflict, prioritize: (1) Instant Social Fun → (2) Fair, Fast Rounds → (3) Easy Room-Based Multiplayer → (4) Music Memory Challenge

### Core Gameplay Loop

```
Join Room → Hear Song → Place on Timeline → Reveal Correctness → Update Score/Timeline → Pass Turn → Repeat
```

1. **Join Room:** Players enter a room code to connect to a shared game session
2. **Hear Song:** A song snippet plays for all players simultaneously
3. **Place on Timeline:** Each player drags the song card to their personal vertical timeline, positioning it before, between, or after existing songs
4. **Reveal Correctness:** Once all players submit their placement, the correct release year is revealed
5. **Update Score/Timeline:** Correct placements are locked into the timeline and the player's score increases
6. **Pass Turn:** The next song begins, and the cycle repeats
7. **Match End:** First player to correctly place 10 songs wins the match

### Win/Loss Conditions

**Win Condition:**
- First player to correctly place **10 songs** on their timeline wins the match

**Loss Condition:**
- A player loses when their opponent reaches 10 correct placements first

**Optional Bonus:**
- Players may attempt to guess the **artist and track title** for additional points (optional house rule)

**Tie Handling:**
- If both players reach 10 correct placements in the same round, the player with higher accuracy (closer to actual release years) wins
- If still tied, a tiebreaker song determines the winner

---

## Game Mechanics

### Primary Mechanics

**1. Room Management**
- **Create Room:** Host generates a unique 6-character room code and shares it with other players
- **Join Room:** Players enter the room code to connect to an existing session
- **Ready Check:** Host confirms all players are present before starting the match
- **Leave Room:** Players can disconnect; room persists for remaining players

**2. Song Playback**
- **Play Snippet:** Server triggers a 15-30 second audio snippet from the song catalog via Spotify integration
- **Song Selection:** Songs are drawn from a configurable catalog (~500 tracks) with balanced era/genre distribution
- **Playback Sync:** All players hear the same song snippet simultaneously within network tolerance

**3. Timeline Placement**
- **Drag to Place:** Player drags a song card onto their vertical timeline
- **Insertion Point:** Song can be placed before the first song, between any two songs, or after the last song
- **Visual Feedback:** Timeline shows insertion point with highlight/animation
- **Confirm Placement:** Player clicks/taps to lock in their answer

**4. Scoring System**
- **Correct Placement:** +1 point when a song is placed in the correct chronological position relative to all existing timeline songs
- **Incorrect Placement:** 0 points; song is removed and the correct position is revealed
- **Bonus Guess (Optional):** +1 extra point for correctly identifying artist and track title from multiple choice options

**5. Round Resolution**
- **Simultaneous Reveal:** Once all players submit placements, the correct release year is displayed
- **Timeline Update:** Correctly placed songs are locked into each player's timeline
- **Score Display:** Current scores are shown to all players
- **Next Turn:** A new song begins after a brief 3-second transition

**6. Match Management**
- **Win Detection:** Server checks after each round if any player has reached 10 correct placements
- **Match End:** Winning player is announced with a celebration screen showing final scores
- **Rematch Option:** Players can start a new match in the same room with one click

### Controls and Input

**Desktop (Mouse/Keyboard):**
- **Click and Drag:** Grab song card and drag to timeline insertion point
- **Click to Confirm:** Left-click to lock in placement
- **Keyboard Shortcuts:** Enter to confirm, Escape to cancel placement
- **Room Actions:** Click buttons for Create Room, Join Room, Start Match

**Mobile (Touch):**
- **Touch and Drag:** Hold song card and slide to timeline position
- **Tap to Confirm:** Single tap to lock placement
- **Swipe:** Swipe down to cancel placement and return card
- **Room Actions:** Tap large touch-friendly buttons for all room flow actions

**Shared Input Rules:**
- All interactions have a 100ms debounce to prevent accidental double-inputs
- Placement can be changed freely before confirmation
- After confirmation, a 0.5s animation plays before the next song begins
- Timeout: If a player doesn't place within 60 seconds, they forfeit the turn (0 points)

---

{{GAME_TYPE_SPECIFIC_SECTIONS}}

---

## Progression and Balance

### Player Progression

{{player_progression}}

### Difficulty Curve

{{difficulty_curve}}

### Economy and Resources

{{economy_resources}}

---

## Level Design Framework

### Level Types

{{level_types}}

### Level Progression

{{level_progression}}

---

## Art and Audio Direction

### Art Style

{{art_style}}

### Audio and Music

{{audio_music}}

---

## Technical Specifications

### Performance Requirements

{{performance_requirements}}

### Platform-Specific Details

{{platform_details}}

### Asset Requirements

{{asset_requirements}}

---

## Development Epics

### Epic Structure

{{epics}}

---

## Success Metrics

### Technical Metrics

{{technical_metrics}}

### Gameplay Metrics

{{gameplay_metrics}}

---

## Out of Scope

{{out_of_scope}}

---

## Assumptions and Dependencies

{{assumptions_and_dependencies}}