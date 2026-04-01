---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: '3D Print Production Tracker - Backend-free React app for multi-color filament printing optimization'
session_goals: 'Color-first workflow, printing queue management, figure/color CRUD, smart filtering, import/export data portability'
selected_approach: 'ai-recommended'
techniques_used: ['Role Playing', 'SCAMPER Method', 'Reverse Brainstorming', 'Question Storming', 'Morphological Analysis']
ideas_generated: 47
session_active: false
workflow_completed: true
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Paolo
**Date:** 2026-03-25

## Session Overview

**Topic:** 3D Print Production Tracker — A practical, backend-free React web app for managing multi-color 3D printed figures with color-based batch printing optimization for a small business selling on Vinted and Subito.it.

**Goals:**
- Color-first workflow: Select a color → see figures in the printing queue that need it (toggle to see all)
- Printing queue as a core concept — figures actively planned for printing vs. full catalog
- Figure management: CRUD with any number of required colors
- Color management: CRUD with visual color preview
- Smart filtering: By color, franchise, status, etc.
- Production planning: Support stocking up and order fulfillment modes
- No backend: LocalStorage or similar + JSON import/export for data portability
- Simple, practical, and useful

### Session Setup

_Session initialized with focus on brainstorming features, UX patterns, data model ideas, and workflow optimizations for a 3D print production tracker._

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** 3D Print Production Tracker with focus on color-first workflow, queue management, and practical simplicity

**Recommended Techniques:**

- **Role Playing:** Walk through real daily scenarios (receiving orders, planning batches, swapping filament) to discover all needed features
- **SCAMPER Method:** Systematically push each workflow through 7 lenses to turn "how I work today" into "how the app could make it better"
- **Reverse Brainstorming:** Flip it — "How could we make this app useless?" — to reveal which features are truly critical and surface edge cases

**AI Rationale:** Concrete product design session with clear domain expertise. Techniques selected to extract real workflows first, expand systematically second, and stress-test for essentials third.

## Technique Execution Results

### Role Playing (Scenarios 1-4)

**Interactive Focus:** Walked through 4 real-world scenarios — batch print day, urgent order, catalog management, customer filter request.

**Key Breakthroughs:**
- Colors are physical filament spools, not abstract labels — anchors the entire data model
- Queue is the home screen — action-first, not catalog-first
- Per-figure color chip toggle with progress bar is the core interaction (user provided mockup)
- Two modes: stocking vs. order fulfillment, merged in one queue with priority

**Ideas Generated:**
1. Queue-as-Home-Screen
2. Color Frequency Ranking
3. Per-Figure Color Chip Toggle
4. Figure Completion Flow
5. Color-Done State in Ranking
6. Inline Figure Creation
7. Dual Figure Creation Paths
8. Priority-Aware Queue Merging
9. Near-Completion Nudge
10. Figure Data Model (name, franchise, default size, notes, colors[])
11. Franchise as Filterable Tag
12. Filament Spool as First-Class Entity
13. Visual Color Picker in Spool Management
14. Spool Library — Existence Only
15. Multi-Color Filter with AND/OR Toggle
16. Color Efficiency Filter
17. Franchise + Color Combined Filtering

### SCAMPER Method

**Interactive Focus:** Pushed workflows through 7 systematic lenses (Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse).

**Key Breakthroughs:**
- Colors-first reverse lookup: "I have these spools, what can I fully print?"
- Triple queue view (Figure/Color/Timeline) — same data, three perspectives
- Draggable color sequence — app suggests, user overrides
- Deliberate "no" decisions are design decisions (no analytics, no auto-suggestions)

**Ideas Generated:**
18. Reverse Lookup — Colors-First Discovery
19. Lightweight Order Context on Queue Items
20. Draggable Color Sequence
21. Triple Queue View (Figure view, Color view, Timeline view)
22. No Analytics — Stay in Your Lane
23. Auto-Complete with Session Memory
24. No Auto-Suggestions

### Reverse Brainstorming

**Interactive Focus:** "How could we make this app completely useless?" — 13 anti-ideas explored, each revealing a critical design principle.

**Key Breakthroughs:**
- Data persistence is the #1 non-negotiable — losing state kills the app
- Color-figure relationship is THE core feature, not a secondary concern
- Mobile-first is essential — user prints with phone in hand
- Zero confirmation modals for reversible actions, confirmation only for destructive

**Ideas Generated:**
25. Data Persistence is Sacred
26. Color-Figure Relationships Are the Core
27. Instant Visual Feedback on Every Action
28. Zero Confirmation Modals for Reversible Actions
29. Responsive / Mobile-First
30. Inline Color Creation During Figure Editing
31. Replace Paper, Not Replicate It

### Question Storming

**Interactive Focus:** Generated questions only — 10 edge-case questions across data/state and workflow dimensions.

**Key Breakthroughs:**
- Same figure + same size = quantity badge (x2), different sizes = separate cards
- Partial reprint support needed — 3D printing failures are reality
- Figures can exist with zero colors (work in progress catalog entries)
- Queue is ephemeral, catalog is permanent — clean mental model

**Ideas Generated:**
32. Safe Color Deletion
33. Queue Quantity / Duplicates
34. Instant Auto-Save
35. Partial Reprint Support
36. Incomplete Catalog Entries
37. Order Cancellation — Clean Removal

### Morphological Analysis

**Interactive Focus:** Mapped 4 dimensions (Entities, Views, Actions, Navigation) into a complete grid, then scanned for gaps.

**Key Breakthroughs:**
- Live catalog-to-queue binding (references, not snapshots)
- Two note layers: permanent figure tips vs. ephemeral job notes
- Single-file JSON export for maximum simplicity
- Empty state onboarding — app teaches itself through clear CTAs

**Ideas Generated:**
38. Catalog Search Bar
39. Add-to-Queue Flow
40. Single-File JSON Export
41. Live Catalog-to-Queue Binding
42. Bulk Add to Queue
43. Two Note Layers (figure notes permanent, queue notes per-job)
44. Color Edit Global Propagation
45. Empty State Onboarding
46. No Theme Toggle — Use Existing Design System
47. Confirmation Modals for Destructive Actions Only

### Creative Facilitation Narrative

Paolo brought deep domain expertise and strong instincts about what matters vs. what's noise. The session's breakthrough moment was discovering that colors are physical filament spools — this single insight anchored the entire data model and interaction design. Paolo consistently showed good judgment about when to specify (the color chip toggle mockup, the "no analytics" call) and when to delegate design decisions, keeping the session focused on workflow over visual polish.

## Idea Organization and Prioritization

### Thematic Organization

**Theme 1: Queue & Printing Workflow (Core Loop)** — 16 ideas
The heart of the app. Queue-as-home-screen, color frequency ranking, per-figure color chip toggle, completion flow, priority-aware merging, triple queue view, draggable color sequence, order context, quantity/duplicates, partial reprints, add-to-queue flow, bulk add.

**Theme 2: Data Model & Architecture** — 11 ideas
The invisible foundation. Figure data model, spool as first-class entity, color-figure relationships, instant auto-save, live catalog-to-queue binding, single-file JSON export, two note layers, global propagation on edits.

**Theme 3: Catalog & Color Management** — 7 ideas
Setting up and maintaining libraries. Dual creation paths, franchise tags, visual color picker, inline color creation, safe deletion, search bar, destructive action modals.

**Theme 4: Filtering & Discovery** — 4 ideas
Finding the right figures. Multi-color AND/OR filter, color efficiency filter, compound filters, colors-first reverse lookup.

**Theme 5: UX Principles (Non-Negotiables)** — 6 ideas
Design principles. Instant feedback, zero modals for reversible actions, mobile-first, replace paper not replicate, empty state onboarding, use existing theme.

**Theme 6: Deliberate Exclusions** — 3 ideas
Anti-features. No analytics, no auto-suggestions, no spool inventory tracking.

### Prioritization Results

**Must-Have (v1 Core):**
- P1: Color Frequency Ranking — THE reason to build this app
- P2: Per-Figure Color Chip Toggle — the primary interaction
- P3: Color-Figure Relationships — data foundation
- P4: Queue-as-Home-Screen — action-first landing
- P5: Filament Spool as First-Class Entity — colors = real spools
- P6: Figure Data Model — name, franchise, size, notes, colors
- P7: Instant Auto-Save — LocalStorage on every action
- P8: Visual Color Picker — hex preview for spool distinction
- P9: Triple Queue View (Figure + Color views minimum) — plan + print modes
- P10: Single-File JSON Export — data portability safety net

**Should-Have (v1 Complete):**
- S1: Franchise Filterable Tag
- S2: Catalog Search Bar
- S3: Inline Color Creation during figure edit
- S4: Add-to-Queue Flow with defaults
- S5: Lightweight Order Context (buyer/platform/date)
- S6: Figure Completion Flow (completed section, collapsible)
- S7: Color-Done State in Ranking (strikethrough + bottom)
- S8: Dual Figure Creation Paths
- S9: Two Note Layers
- S10: Safe Deletion with Confirmation Modals

**Nice-to-Have (v2):**
- N1: Priority-Aware Queue Merging
- N2: Reverse Lookup — Colors-First Discovery
- N3: Draggable Color Sequence
- N4: Multi-Color Filter AND/OR
- N5: Queue Quantity / Duplicates (x2 badge)
- N6: Bulk Add to Queue
- N7: Partial Reprint Support
- N8: Color Efficiency Filter
- N9: Franchise + Color Compound Filters
- N10: Near-Completion Nudge

**Always Apply (UX Principles):**
- Instant Visual Feedback
- Zero Modals for Reversible Actions
- Responsive / Mobile-First
- Replace Paper, Not Replicate It
- Empty State Onboarding
- Data Persistence is Sacred
- Live Catalog-to-Queue Binding
- Color Edit Global Propagation
- Incomplete Catalog Entries OK
- Order Cancellation — Clean Removal
- No Theme Toggle — Use Existing Design System

**Never Build:**
- No Analytics (lives in spreadsheet / future back office)
- No Auto-Suggestions (app serves decisions, never makes them)
- No Spool Inventory Tracking (you know your shelf)

## Session Summary and Insights

**Key Achievements:**
- 47 ideas generated across 5 techniques in one session
- Clear prioritization into Must-Have / Should-Have / Nice-to-Have / UX Principles / Never Build
- Complete data model sketch: Spool Colors → Figures → Queue Items with live binding
- Core interaction designed with user-provided mockup (color chip toggle with progress)
- Strong "anti-feature" list preventing scope creep

**Breakthrough Moments:**
1. Colors are physical filament spools — anchored the entire data model
2. The color frequency ranking as THE core feature — optimization over mere tracking
3. Triple queue view — same data, different mental modes
4. Deliberate exclusions (no analytics, no suggestions) — knowing what NOT to build

**Design Principles Established:**
- Queue is home. Action-first, not catalog-first.
- The app is a tool, not an assistant. It serves your decisions.
- Every feature must beat paper. If it doesn't, cut it.
- Mobile at the printer, desktop at the desk. Both must work.
- One tap for reversible, modal for destructive. No middle ground.
