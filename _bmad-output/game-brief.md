---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: []
documentCounts:
  brainstorming: 0
  research: 0
  notes: 0
workflowType: 'game-brief'
lastStep: 0
project_name: 'cursor-test'
user_name: 'Ju'
date: '2026-04-25T19:22:40-03:00'
game_name: 'Hitster Web'
---

# Game Brief: Hitster Web

**Date:** 2026-04-25
**Author:** Ju
**Status:** Draft for GDD Development

---

## Executive Summary

Hitster Web is a multiplayer web party game where players listen to songs and place them in chronological order on their personal timelines in a shared room.

**Target Audience:** Casual players aged 10+ in family and friend groups, playing locally or remotely in short social sessions.

**Core Pillars:** Instant social fun, music memory challenge, fair fast rounds, and easy room-based multiplayer.

**Key Differentiators:** Web-native room code access, hybrid local+remote play in the same session, and a classic+modern music mix.

**Platform:** Web browser only, with mobile-responsive UI.

**Success Vision:** A stable, replayable 2-player MVP that is easy to start, fun to finish, and consistently makes players want another round.

---

## Game Vision

### Core Concept

A multiplayer web party game where players listen to songs and place them in chronological order on their timeline inside a shared room.

### Elevator Pitch

Hitster Web is a multiplayer music guessing game where players join a shared room and listen to tracks while building a personal timeline in chronological order. On each turn, players must place songs by release year and can prove deeper knowledge by identifying the artist and track title. The hook is the mix of nostalgia, competition, and real-time party energy that makes every round feel like a social music challenge.

### Vision Statement

Hitster Web should make players feel nostalgia from classic songs while staying connected to the present through current hits. It should create a strong competitive spirit where music knowledge feels rewarding and social. The game matters because it brings people together through shared musical memories, discovery, and friendly challenge.

---

## Target Market

### Primary Audience

Hitster Web is designed for a broad social audience of players aged 10+, focused on family and friends playing together in casual settings.

**Demographics:**
- Age: 10 to adult (family-friendly range)
- Group type: family and friend groups
- Session mode: local gatherings or remote participants joining the same room code

**Gaming Preferences:**
- Casual players
- No prior music quiz/party game experience required
- Short, easy-to-start rounds (default target: first to 10 songs)

**Motivations:**
- Have fun together with minimal setup
- Enjoy music nostalgia and current hits
- Add friendly competition to social moments (snacks, drinks, hangouts)

### Secondary Audience

No separate secondary audience is defined at this stage.

### Market Context

This project is intentionally non-commercial and intended for personal use with family and friends. Success is measured by ease of setup, replayability, and social enjoyment rather than market traction.

**Similar Successful Games:**
- Hitster (core inspiration and mechanic reference)
- Other casual music quiz/party formats that validate social music gameplay appeal

**Market Opportunity:**
- A lightweight browser-based version with room code access for both co-located and remote play
- Fast "create room / join room" flow tailored to private groups

---

## Game Fundamentals

### Core Gameplay Pillars

1. **Instant Social Fun**  
   The game must be quick to start and enjoyable in group settings, with minimal friction before players begin interacting.

2. **Music Memory Challenge**  
   The central skill is recognizing songs and placing them in the correct historical order, rewarding musical knowledge and intuition.

3. **Fair, Fast Rounds**  
   Rounds should move quickly, rules should stay clear, and outcomes should feel consistent and understandable for all players.

4. **Easy Room-Based Multiplayer**  
   Players should be able to create or join a room with a simple code, whether they are physically together or remote.

**Pillar Priority:**  
When pillars conflict, prioritize:  
1) Instant Social Fun -> 2) Fair, Fast Rounds -> 3) Easy Room-Based Multiplayer -> 4) Music Memory Challenge

### Primary Mechanics

- Create room / join room with code
- Start round and play song snippet
- Place song card on timeline (before/between/after existing songs)
- Reveal result and score/keep card if correct
- Optional bonus: guess artist + title for extra reward
- Win condition: first to 10 correct songs

**Core Loop:**  
Join room -> hear song -> place on timeline -> reveal correctness -> update timeline/score -> pass turn -> repeat until a player reaches 10 correct songs.

### Player Experience Goals

- During play: excitement, suspense, nostalgia, friendly rivalry
- After play: satisfaction from music knowledge, laughter, social connection, "one more round" desire
- Emotional journey: quick setup -> rising tension each placement -> reveal highs/lows -> social celebration and rematch impulse

---

## Scope and Constraints

### Target Platforms

**Primary:** Web browser (desktop + mobile responsive)  
**Secondary:** None for now (web-only scope)

### Development Timeline

Part-time solo development with iterative delivery. Prioritize MVP-first milestones: stable room flow, core gameplay loop, then incremental polish.

### Budget Considerations

This is a non-commercial personal project with a shoestring budget. The project should prioritize free/open-source tooling and low recurring costs while still using managed services to reduce operational overhead.

**Infrastructure Preferences:**
- Netlify for hosting/deployment
- Supabase for database/backend services
- Cloudinary for asset hosting/management

### Team Resources

Development is handled by a solo developer.

**Team Composition:**
- Solo ownership of product decisions, frontend, backend, and deployment
- Lean decision-making and rapid iteration due to single-owner workflow

**Skill Gaps / Risk Areas:**
- Advanced UI/UX polish may be limited by solo bandwidth
- Large-scale real-time optimization may require future iteration
- Music licensing/compliance details may require additional research and constraints handling

### Technical Constraints

- Web app only, with mobile-responsive interface
- Room-code multiplayer must support both co-located and remote players in the same game room
- Real-time synchronization required for turns, timeline state, and scoring
- Architecture should remain simple and maintainable for solo development
- Prioritize fast load times and frictionless room join flow
- Favor gameplay stability and clarity over advanced visual complexity
- Include server-side validation for critical game actions to reduce cheating/inconsistent state

---

## Reference Framework

### Inspiration Games

**Hitster (physical)**
- Taking: chronological song placement mechanic, social turn-based music challenge
- Not Taking: physical card dependency; web version should support instant room-based multiplayer

**Cuphead**
- Taking: fun, expressive, nostalgic atmosphere
- Not Taking: an exclusively retro/old-only tone; Hitster Web should include both classic and modern music identity

### Competitive Analysis

**Direct Competitors:**
- Hitster physical (primary and only direct reference for this personal project)

**Competitor Strengths:**
- Strong social fun and group engagement
- Easy-to-understand core mechanic
- Nostalgia-driven excitement

**Competitor Weaknesses (for this project's use case):**
- Physical setup dependency
- No instant browser room creation/join flow
- Limited flexibility for mixed local + remote participation in the same session

### Key Differentiators

1. **Web-native room-code multiplayer**  
   Instant access from browser without physical setup.

2. **Hybrid social play model**  
   Supports both co-located and remote players in one shared game room.

3. **Cross-generation music mix**  
   Intentionally combines classic nostalgia with modern tracks.

**Unique Value Proposition:**  
Hitster Web delivers the social timeline-based music challenge of Hitster in a lightweight browser experience that friends and family can join instantly by room code, whether together in person or playing remotely.

---

## Content Framework

### World and Setting

Hitster Web uses a minimal, abstract, UI-only party game world with no lore. The atmosphere is vibrant, nostalgic, modern, and energetic, with interface clarity prioritized over thematic world-building.

### Narrative Approach

Narrative is minimal by design. **Gameplay-first is a hard requirement** and takes priority over any storytelling layer.

**Story Delivery:**  
No cutscenes or dialogue. Narrative feeling is emergent from song eras, player choices, competitive moments, and social interaction during matches.

### Content Volume

Initial playable catalog will include a configurable song list, with a default starter dataset of approximately 500 songs and Spotify links/identifiers for playback through Spotify API integration. Content should be maintainable and expandable via configuration rather than hardcoded game data.

---

## Art and Audio Direction

### Visual Style

Clean, modern interface with vibrant accents. Timeline and card placement interactions are the visual center, with lightweight, functional animations.

**References:**  
Minimal party-game UI patterns optimized for readability and speed, with clear hierarchy on both desktop and mobile.

### Audio Style

Spotify-based track playback is the core audio experience. UI sound effects should be minimal and feedback-oriented. No voice acting is required.

### Production Approach

Solo-friendly production with strong MVP discipline:
- Reuse standard UI components where possible
- Minimize custom art overhead
- Focus on responsiveness and interaction clarity
- Keep implementation maintainable and test-driven (TDD)

---

## Risk Assessment

### Key Risks

1. Spotify integration assumptions and playback constraints
2. Match flow dependency on all players completing their placement
3. Scope creep beyond MVP
4. Mobile timeline usability
5. Room readiness and start-flow friction

### Technical Challenges

- Integrating Spotify API for reliable playback and track metadata linking
- Building a configurable 500-song starter catalog and scalable content config
- Supporting an asynchronous round pattern where each player can hear/process their own song flow
- Handling stall cases when one player blocks round completion
- Designing a vertical timeline interaction that remains clear on mobile

### Market Risks

Market risk is low-priority because the project is private and non-commercial; success depends on playability for small friend/family groups rather than public traction.

### Mitigation Strategies

- **Spotify/data:** Use Spotify API as primary source, keep catalog configurable, ship with curated default list (~500 tracks)
- **Round flow:** Start with 2-player rounds only; explicitly support "wait until both placed" flow
- **Sync model:** Use lightweight readiness checkpoints (e.g., "everyone is here?"/continue button) instead of always-on sync
- **Blocked player handling:** Add timeout/retry/manual continue logic so sessions can recover from player-side issues
- **MVP control:** Enforce MVP boundary continuously and use TDD to protect core gameplay behavior
- **Mobile UX:** Use vertical timeline layout with touch-friendly placement and early usability testing

---

## Success Criteria

### MVP Definition

- 2-player only
- Create room + join by code
- Host starts match after one pre-game "everyone is here?" confirmation
- Start game and play Spotify-linked tracks from configurable list
- Each player places songs on their own vertical timeline
- Round resolves when both players submit
- Correct placement updates score/timeline
- First to 10 correct songs wins
- Continuous in-round flow (no extra sync confirmation every turn)
- No advanced cosmetics, no extra modes yet

### Success Metrics

- Room setup success: both players join and start in under 2 minutes
- Match completion rate: at least 80% of started matches reach end condition
- Round flow reliability: no state desync in normal 2-player sessions
- Gameplay satisfaction: "would play again" in family/friends playtests
- Stability: no blocker bugs during a full match to 10 songs

### Launch Goals

- Deliver a stable private MVP for family/friends sessions
- Validate game flow and fun factor in real 2-player matches
- Confirm Spotify-backed playlist workflow is reliable
- Establish a strong TDD safety net for core gameplay rules

---

## Next Steps

### Immediate Actions

1. Build vertical timeline interaction prototype
2. Implement room create/join + host start flow
3. Integrate Spotify playback and configurable song catalog seed (~500 entries)
4. Implement core round engine + server-side validation
5. Add scoring/win condition (first to 10)
6. Run TDD-first test suite for core game rules
7. Playtest with 2 players and iterate on UX

### Research Needs

- Spotify API integration details and playback constraints in your target regions
- Practical schema and tooling for maintaining the configurable song catalog
- Edge-case handling for stalled players and reconnection flow
- Mobile usability heuristics for vertical timeline interactions

### Open Questions

- Should host have a manual force-continue option for blocked rounds?
- What is the ideal default song mix (decade and genre balance) for the first 500 songs?
- How should tie scenarios be handled if both players reach 10 in the same round?
- What minimum analytics/telemetry is needed for private playtest feedback?

---

## Appendices

### A. Research Summary

{{research_summary}}

### B. Stakeholder Input

{{stakeholder_input}}

### C. References

- Hitster mechanics reference: https://hitstergame.com/pt-pt/como-jogar/

---

_This Game Brief serves as the foundational input for Game Design Document (GDD) creation._

_Next Steps: Use the `workflow gdd` command to create detailed game design documentation._
