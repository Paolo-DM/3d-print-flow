---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - 'product-brief-3d-print-flow.md'
  - 'product-brief-3d-print-flow-distillate.md'
  - 'brainstorming-session-2026-03-25-1200.md'
  - 'project-context.md'
workflowType: 'prd'
documentCounts:
  briefs: 2
  research: 0
  brainstorming: 1
  projectDocs: 1
classification:
  projectType: 'Web App'
  domain: 'General (niche manufacturing operations)'
  complexity: 'Medium'
  projectContext: 'Greenfield'
---

# Product Requirements Document - 3d-print-flow

**Author:** Paolo
**Date:** 2026-03-26

## Executive Summary

3D Print Flow is a lightweight, local-first web application that solves a specific production problem for small-scale 3D printing businesses: **deciding which filament spool to load next and knowing every figure that can advance with it.** The app targets a single operator managing a home-based figure-printing business selling on marketplaces like Vinted and Subito.it, working with 20-100+ figure designs, 5-30 active print jobs, and 10-30 filament spools across two single-spool FDM printers.

Today, production planning lives on paper and in the operator's head. This works until it doesn't — figures get missed during a color run, forcing redundant spool swaps that waste time and filament. The core insight driving this product: **paper fails at completeness, not planning.** The operator can mentally rank which color to load next, but cannot reliably guarantee every figure needing that color has been printed before unloading. 3D Print Flow eliminates that gap.

The app delivers two things: **speed at the printer** (glance at the ranked color list, see every figure awaiting that spool, tap chips as you print) and **confidence at the desk** (full queue visibility, order tracking, nothing slipping through the cracks). No backend, no accounts, no cloud — just React with IndexedDB for persistence and JSON export for backup and portability.

### What Makes This Special

**Color-first scheduling.** Every existing tool in this space — SimplyPrint, Spoolman, 3DPrintOps — organizes around printers, jobs, or filament inventory. 3D Print Flow is the only tool that treats the physically loaded filament spool as the primary axis for production decisions. This isn't a feature bolted onto a print manager — it's a fundamentally different mental model where the queue is viewed, filtered, and optimized through the lens of "what can I do with the spool I have loaded right now?"

The color frequency ranking — a live, always-correct count of queued figures still needing each color — is the killer feature. It turns a chaotic multi-figure, multi-color queue into a clear sequential plan. Combined with per-figure color chip toggles that provide instant visual feedback and automatic progress tracking, the app replaces paper with something paper cannot do: guarantee completeness.

Data integrity is the product promise. The ranking must reflect reality at all times — every chip toggle instantly recalculates, every view is live. If the user cannot trust the color list, the entire value proposition collapses.

## Project Classification

- **Project Type:** Web App (React SPA, browser-based, no backend)
- **Domain:** General — niche manufacturing operations (no regulatory or compliance requirements)
- **Complexity:** Medium — low infrastructure complexity, medium product complexity (non-trivial data relationships with live catalog-to-queue binding and per-job color overrides, algorithmic ranking logic, dual interaction paradigms for mobile and desktop, IndexedDB as sole persistence layer)
- **Project Context:** Greenfield

## Success Criteria

### User Success

- **Color view is exhaustive:** If a queued figure needs a color and hasn't been marked complete, it appears in that color's list. No exceptions. The user never unloads a spool only to discover they missed a figure.
- **Next spool decision in under 10 seconds:** Glance at the ranked color list, pick the top color, load the spool. No spreadsheet, no mental math, no second-guessing.
- **One-tap figure recycling:** Completed figures can be re-queued for another run with a single action. Reusing a figure design for future prints is faster in the app than writing it on paper again.
- **Daily driver adoption:** The app fully replaces paper and spreadsheet tracking within the first week of use. If the user reaches for paper, the app has failed.
- **Self-guided onboarding:** A new user can create their first spool, first figure, and first queue item within 5 minutes of opening the app, guided only by the UI itself.

### Business Success

- **Single-user tool, not a business:** This is a personal productivity tool, not a revenue-generating product. Business success = the operator's printing day is measurably more efficient. No user growth targets, no revenue metrics, no engagement funnels.
- **Time saved per printing session:** Fewer spool swaps per session compared to paper-based planning. The operator should feel the difference within the first batch run.

### Technical Success

- **Zero data loss:** IndexedDB auto-save on every mutation. JSON export always visible and functional. No user action is ever lost.
- **In-memory state is source of truth:** UI updates instantly from in-memory state. Async IndexedDB writes are guaranteed on every mutation. If a write fails, the user is notified. The color ranking recalculates on every interaction with zero lag.
- **Works on both devices:** Fully functional on phone at the printer and desktop at the desk. Not "technically responsive" — genuinely usable in both contexts with appropriate interaction patterns.

### Measurable Outcomes

- Color ranking is always live and correct after every chip toggle
- Every mutation triggers an IndexedDB write; in-memory state drives rendering immediately
- JSON export produces a complete, re-importable snapshot of all data
- Mobile tap targets meet minimum 44px accessibility standard
- No operation requires more than 2 taps/clicks to initiate from its parent view
- First-run onboarding (spool + figure + queue item) completable in under 5 minutes without external guidance

## User Journeys

### Journey 1: The Printing Session — "What Can I Print With This Spool?"

**Paolo** has 14 figures in his print queue and two FDM printers running. He just finished a batch of parts in black PLA and needs to decide what spool to load next.

**Opening Scene:** Paolo sits at his desk, opens 3D Print Flow on his laptop. The home screen shows the Color View — a ranked list of filament colors sorted by how many queued figures still need them. White is at the top with 8 figures, followed by red with 6. Two order-flagged figures needing white sit above the stock items.

**Rising Action:** He picks white — it's the clear winner. The view expands to show all 8 figures that need white, with the two orders highlighted at the top. He mentally notes the figures, walks to the printer, loads the white spool on Printer 1, and starts printing. Between prints, he comes back to the desk and taps the white chip on each completed figure's card. The chip fills, the figure's progress bar advances, and the count next to "White" in the ranking ticks down: 8 → 7 → 6.

**Climax:** After printing white parts for all 8 figures, the white entry drops off the ranking entirely. He glances at the updated list — red is now on top. He didn't have to think, search, or check a spreadsheet. The app guaranteed he hit every figure that needed white before he unloaded the spool. Zero wasted swaps.

**Completion Moment:** As Paolo taps the last chip on a Naruto figure, all 4 colors are done. The figure's progress shows 4/4 complete and it moves to the Completed section. A brief visual confirmation acknowledges the completion — no modal, no interruption, just a satisfying state change. The queue count drops by one and the rankings adjust.

**Recycling:** Two weeks later, a customer asks for another Naruto. Paolo opens the Completed section, finds Naruto, and taps "Print Again." The figure re-enters the queue with the catalog's current default colors — all chips reset to incomplete. It's back in the ranking instantly. No re-entering colors, no catalog lookup, one tap.

**Epilogue:** It's late. Paolo closes the browser tab mid-session — red is loaded but only 3 of 6 figures are done. Next morning, he opens the app and everything is exactly as he left it. Red still shows 3 remaining figures. The auto-save contract means there's no "save" button, no session concept, no risk of lost progress. He picks up right where he stopped.

**Capabilities revealed:** Color frequency ranking, per-figure chip toggle, live ranking recalculation, order priority surfacing, progress tracking, figure completion flow, print-again re-queue from completed section, auto-save persistence.

### Journey 2: Catalog Building — "Setting Up and Maintaining Figure Designs"

**Paolo** just finished sculpting and slicing a new Goku figure. He needs to add it to the catalog so he can queue it for printing later.

**Opening Scene:** At his desk, Paolo navigates to the Figure Catalog. He has 47 figures already. He clicks "Add Figure."

**Rising Action:** He fills in the details — name: "Goku SSJ3", franchise: "Dragon Ball", size: 80% (the default is 60% but this sculpt looks better larger), notes: "Support needed on hair spikes, print at 0.12mm layer height." Now he needs to assign colors. He sees his spool library and selects: White, Skin Tone, Orange, Blue, Black. Five chips appear on the figure card, each showing the spool's hex color preview.

**Climax:** He realizes he doesn't have a "Gold" spool for the aura detail. He navigates to the Spool library, creates a new spool (name: "Gold Metallic", hex: #FFD700), comes back and adds it to Goku SSJ3. Six chips total.

**Catalog Edit:** A week later, Paolo realizes his existing "Vegeta Standing Pose" figure is missing a color — he forgot to add "Gold Metallic" for the boots detail. He opens the figure in the catalog and adds the Gold Metallic spool. Vegeta is currently in the print queue with 3/5 colors already printed. Because the catalog-to-queue binding is live, the Gold Metallic chip appears on the queued Vegeta immediately — progress updates to 3/6, and Gold Metallic enters the color ranking with an updated count. Paolo doesn't need to remove and re-add the queue item; the edit propagates automatically.

**Resolution:** The figure catalog is the single source of truth. Changes propagate to the queue in real-time. Creating new figures, editing existing ones, and managing spools all flow naturally into the production queue without manual syncing.

**Capabilities revealed:** Figure CRUD, spool CRUD, color assignment, hex color picker, figure notes, catalog-to-queue live binding, edit propagation to queued items.

### Journey 3: Order Fulfillment — "Customers Are Buying"

**Paolo** gets a notification: someone on Vinted bought a custom Vegeta figure, needs it shipped by Friday.

**Opening Scene:** Paolo opens 3D Print Flow at his desk. He has 6 figures already in the queue — all stock builds.

**Rising Action:** He goes to the catalog, finds "Vegeta Standing Pose," and adds it to the queue. When adding, he marks it as **Order** (not stock). The figure appears in the queue with an order badge.

**Climax:** He returns to the Color View. The ranking has shifted — Vegeta's colors now surface above the stock figures for each color entry. Blue (Vegeta's suit) was previously at position 4 in the ranking. Now the order-flagged need pushes it into the priority section at the top. Paolo knows that when he gets to blue, Vegeta's parts print first.

**Multiple Orders:** By Thursday, two more orders come in — a Luffy from Subito.it and a Naruto from Vinted. Both are added as orders. The Color View now shows three order-flagged figures above the stock items. Within the order tier, figures are treated equally — sorted by the same color frequency logic as stock items. There's no inter-order priority ranking in MVP; Paolo mentally tracks which order is most urgent. The app ensures all orders get worked before stock, and the color optimization still applies within the order tier.

**Resolution:** Paolo works through colors as usual, and the order flag ensures all customer figures are prioritized over stock builds within each color run. By Wednesday, all Vegeta chips are done, the figure moves to completed, and he ships it Thursday — a day early. Luffy and Naruto follow by end of week.

**Capabilities revealed:** Add-to-queue from catalog, stock vs. order flag, order priority in color ranking, multiple concurrent orders (flat priority tier), completion flow.

### Journey 4: First-Time Use — "Empty App, Where Do I Start?"

**Paolo** has just opened 3D Print Flow for the first time. No spools, no figures, no queue. Blank slate.

**Opening Scene:** The home screen (Color View) is empty. Instead of a blank void, a clear CTA explains: "No colors to rank yet. Start by adding your filament spools, then create some figures." A prominent button says "Add Your First Spool."

**Rising Action:** Paolo adds 5 spools he has on his shelf — White, Black, Red, Blue, Skin Tone — each with a hex color. The spool section now shows 5 colored entries. The app nudges: "Great, now create your first figure and assign some colors." He creates "Naruto" with 4 colors: Orange, Black, Blue, Skin Tone. Then "Luffy" with 3 colors: Red, Black, Skin Tone.

**Climax:** He adds both to the queue. Instantly, the Color View comes alive — Black tops the ranking (needed by 2 figures), Skin Tone is second (also 2), then the individual colors. The app just went from empty to actionable in under 5 minutes.

**Resolution:** Paolo taps the first color chip on Naruto and the ranking updates in real-time. He understands the core loop immediately: the app shows what to print, he prints it, he taps the chip. No tutorial needed — the progressive disclosure through empty states taught him the workflow.

**Capabilities revealed:** Empty state onboarding, progressive CTAs, spool creation, figure creation, add-to-queue, first interaction with color ranking.

### Journey 5: Print Failure Recovery — "That Part Came Out Wrong"

**Paolo** printed the white parts for a Goku figure and marked the white chip as complete. An hour later, he notices the part has a layer shift — it's unusable and needs reprinting.

**Opening Scene:** Paolo opens the app and finds Goku in the queue. The white chip is marked complete (filled), and the progress bar shows 4/6 colors done.

**Rising Action:** He taps the white chip again. It toggles back to incomplete — the chip unfills, the progress bar drops to 3/6, and the color ranking instantly recalculates. White reappears in the ranking with an updated count that includes Goku.

**Climax:** The undo is instant, safe, and obvious. No confirmation modal (it's a reversible action), no anxiety about breaking state. Paolo trusts the app because every action is both undoable and immediately reflected everywhere.

**Resolution:** Next time white comes up in the color rotation, Goku's white part is in the list. Paolo reprints it, taps the chip again, and moves on. The failure cost him one reprint, not a wasted spool swap — because the app caught it in the ranking.

**Capabilities revealed:** Chip toggle as true toggle (mark/unmark), live ranking recalculation on undo, reversible actions without confirmation, data integrity on state reversal.

### Journey 6: Data Backup & Restore — "My Laptop Died"

**Paolo** has been using the app for two months. He has 60 figures in the catalog, 15 spools, and 8 figures in the active queue. His laptop's SSD fails.

**Opening Scene:** Paolo gets a new laptop, opens the browser, and navigates to 3D Print Flow. The app is empty — IndexedDB is local to the device. But last Sunday, he exported his data using the always-visible "Export" button in the app header.

**Rising Action:** He clicks "Import" and selects his JSON backup file. A confirmation modal warns: "This will replace all current data with the imported file. This action cannot be undone." He confirms — the app is empty anyway, so there's nothing to lose.

**Climax:** The import completes. All 60 figures, 15 spools, and 8 queue items are back — including chip progress on the active queue. He's lost at most one week of changes (the delta since his last export). The queue shows exactly where he left off on Sunday.

**Resolution:** Paolo makes a mental note to export more frequently. The export button is always visible — not buried in settings — specifically so this moment is as painless as possible. The JSON file is his safety net, his backup strategy, and his cross-device transfer mechanism all in one.

**Capabilities revealed:** JSON export (always-visible action), JSON import (full replace with confirmation modal), data completeness of export format, cross-device portability, disaster recovery.

### Journey Requirements Summary

| Capability | J1 Printing | J2 Catalog | J3 Order | J4 Onboarding | J5 Failure | J6 Backup |
|-----------|:-----------:|:----------:|:--------:|:-------------:|:----------:|:---------:|
| Color frequency ranking | x | | x | x | x | |
| Per-figure chip toggle | x | | | x | x | |
| Chip un-toggle (undo) | | | | | x | |
| Live ranking recalculation | x | | x | x | x | |
| Order priority surfacing | x | | x | | | |
| Multiple concurrent orders | | | x | | | |
| Progress tracking | x | | | | x | |
| Figure completion flow | x | | x | | | |
| Print-again re-queue | x | | | | | |
| Figure CRUD | | x | | x | | |
| Spool CRUD | | x | | x | | |
| Color assignment to figures | | x | | x | | |
| Catalog edit propagation | | x | | | | |
| Hex color picker | | x | | x | | |
| Figure notes | | x | | | | |
| Add-to-queue from catalog | | | x | x | | |
| Stock vs. order flag | | | x | | | |
| Empty state CTAs | | | | x | | |
| Auto-save persistence | x | | | | x | |
| JSON export | | | | | | x |
| JSON import with confirmation | | | | | | x |
| Responsive desktop + mobile | x | x | x | x | x | x |

## Innovation & Novel Patterns

### Core Innovation: Color-First Scheduling

3D Print Flow introduces a novel framing of the production scheduling problem for small-scale 3D printing: **organize work around the physically loaded filament spool, not around figures or jobs.** No existing tool in the 3D printing ecosystem (SimplyPrint, Spoolman, 3DPrintOps, Filametrics) approaches production this way. The insight emerges from the physical reality of single-spool FDM printers: changing filament is the highest-friction operation, so minimizing swaps should drive scheduling.

The technology is simple — a sorted count of queued figures needing each color. The innovation is entirely in the product insight: reframing "what figure should I print next?" as "what can I print with the spool I have loaded?" This reframing has two natural consequences:

- **Completeness guarantee.** Once you rank by color frequency and show all figures needing a color, the user can visually confirm they've hit every figure before unloading the spool. Paper can approximate optimal order but cannot guarantee completeness — the app can.
- **Spool-as-entity data model.** Once colors become the scheduling axis, modeling them as first-class objects (physical spools with names and hex values, not abstract color labels) is the obvious design choice. This anchors the data model in physical reality — the user's app maps directly to their shelf of filament.

Simple implementation of a novel framing. That's a strength, not a weakness.

### Market Context

The 3D printing tool market is fragmented across printer management (SimplyPrint), filament inventory tracking (Spoolman/Spoolstock), and job/customer management (3DPrintOps). No tool occupies the "production scheduling for color changes" niche. This gap exists because the multi-color printing pain point only became mainstream with affordable AMS/MMU systems (Bambu AMS, Prusa MMU) reaching consumer scale in 2024-2025. The market is nascent — community members track production in spreadsheets and paper lists.

### Validation

This is a personal tool for a single operator. The validation is straightforward: Paolo uses it daily and doesn't go back to paper. If the color ranking eliminates redundant spool swaps and the user never discovers a missed figure after unloading, the innovation holds.

### Risk Mitigation

- **Risk: The framing is too niche.** Mitigation: This is a personal tool. Market size doesn't matter — the only validation is daily use.
- **Risk: The ranking algorithm is too simple.** Mitigation: Simple frequency count with order priority partitioning is the MVP. More sophisticated scheduling (minimize total swaps across the full queue) can be added later without changing the core interaction.
- **Risk: Spool-as-entity creates friction for users with many similar colors.** Mitigation: Each spool has a distinct name and hex color. The user manages their own spool library and controls granularity.

## Web App Specific Requirements

### Project-Type Overview

3D Print Flow is a single-page application (SPA) built with React Router v7, running entirely in the browser with no backend dependency. All data persistence is handled client-side via IndexedDB. The app is not publicly accessible content — it's a personal productivity tool accessed directly by its single user.

### Browser Support

- **Target:** Modern evergreen browsers — Chrome, Firefox, Safari, Edge (latest two major versions)
- **Not supported:** Internet Explorer, legacy mobile browsers
- **Rationale:** Single user, controlled environment. No need to support legacy browsers.

### Responsive Design

- **Desktop-primary:** Full-fidelity experience designed for laptop/desktop screens. This is where catalog management, queue planning, and bulk operations happen.
- **Mobile-responsive:** Functional adaptation for smartphone screens. Core interactions (viewing color ranking, tapping chips) work on mobile, but mobile is not the primary design target.
- **Breakpoints:** Standard responsive breakpoints. No separate mobile app or distinct mobile-specific views — the same views adapt to smaller screens.
- **No tablet-specific optimization:** If it works on desktop and mobile, tablet is covered.

### Performance Targets

- **Initial load:** Under 2 seconds on a modern laptop with broadband. The app is a client-side SPA with no API calls — initial load is the bundle plus IndexedDB hydration.
- **Interaction response:** Every local operation (chip toggle, CRUD, navigation) must reflect in the UI within a single frame (~16ms). No loading spinners for local operations.
- **Ranking recalculation:** Instant on every chip toggle. With a queue of 30 figures and 30 spools, the ranking computation is trivial — O(n*m) where both n and m are small. No optimization needed; brute-force recomputation on every state change is fine.
- **IndexedDB writes:** Asynchronous, non-blocking. UI updates from in-memory state; persistence happens in the background. Write failures surface a notification.

### SEO Strategy

Not applicable. This is a local-first personal tool with no public-facing content, no shareable URLs, and no need for search engine indexing. Server-side rendering exists via React Router's `react-router-serve` but serves the app shell, not indexable content.

### Accessibility

- **Level:** Pragmatic accessibility — semantic HTML, keyboard navigability, sufficient color contrast, minimum 44px interactive targets.
- **Not targeting:** Formal WCAG AA certification. This is a personal tool for a sighted user.
- **Key considerations:**
  - Color chips must be distinguishable by more than color alone (spool name labels, not just hex swatches)
  - Interactive elements must have visible focus states
  - Screen reader support is not a priority but semantic markup ensures basic compatibility

### Implementation Considerations

- **State management:** In-memory state derived from IndexedDB on app load. All mutations update in-memory state first (instant UI), then persist to IndexedDB asynchronously. The in-memory state is the single source of truth for rendering.
- **Data layer:** IndexedDB via a lightweight wrapper (e.g., idb-keyval or similar). Three stores: spools, figures, queue items. Referential integrity maintained at the application level, not the database level.
- **Routing:** React Router v7 file-based routing. Routes for: home/color view, figure view, catalog, spool management, completed section. No dynamic route parameters needed for MVP.
- **Build:** Vite 7 with React Compiler (babel-plugin-react-compiler) for automatic memoization. No manual useMemo/useCallback/React.memo.
- **Styling:** Tailwind CSS v4 with shadcn/ui components. Semantic color tokens from the theme. Dark mode supported via `.dark` class.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — the minimum feature set that replaces paper and spreadsheet tracking for 3D print production scheduling. The MVP succeeds when it's faster and more reliable than the current manual workflow. No market validation needed, no investor pitch — just a daily-driver tool for one operator.

**Resource Requirements:** Solo developer (Paolo), with occasional contributions from colleagues. No dedicated designer — UI built with shadcn/ui components and Tailwind utility classes. No backend infrastructure, no DevOps, no deployment pipeline beyond static hosting.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- J1: Printing Session (color ranking → chip toggle → completion → re-queue)
- J2: Catalog Building (figure and spool CRUD, color assignment, edit propagation)
- J3: Order Fulfillment (stock vs. order flag, priority in ranking)
- J4: First-Time Use (empty state onboarding)
- J5: Print Failure Recovery (chip un-toggle)
- J6: Data Backup & Restore (JSON export/import)

All six journeys are fully supported by MVP capabilities. No journey requires Growth or Vision features to complete.

**Must-Have Capabilities:**
- Filament spool management (CRUD with name and hex color picker)
- Figure catalog management (CRUD with name, franchise tag, default size, notes, required colors)
- Print queue (add from catalog, per-figure color chip toggle, progress tracking)
- Queue item type (stock vs. order flag)
- Color frequency ranking (home/default view, orders prioritized above stock)
- Figure completion flow (all chips done → completed section)
- Completed section (collapsible archive with one-tap "print again" re-queue)
- Dual queue view (Color view as home/default, Figure view)
- Catalog-to-queue live binding (edits propagate to queued items)
- IndexedDB persistence (auto-save on every mutation, in-memory state as source of truth)
- JSON export/import (always-visible export, import with full-replace confirmation)
- Responsive design (desktop-primary, mobile-responsive)
- Empty state onboarding (progressive CTAs guiding first-time setup)

### Post-MVP Features

**Phase 2 — Growth (order details, catalog polish, third view):**
- Full order context — buyer name, platform (Vinted/Subito.it), due date
- Timeline view — third queue perspective (UX to be defined)
- Color override per queue item — variant color schemes without catalog duplication
- Franchise filterable tag — filter catalog and queue by franchise
- Catalog search — full-text across figure name and franchise
- Inline color creation — create spools during figure editing
- Inline figure creation — create figures from the queue add flow without navigating to the catalog
- Two note layers — permanent figure notes vs. ephemeral job notes
- Safe deletion — reference checking with affected items shown in confirmation

**Phase 3 — Vision (power features for advanced optimization):**
- Reverse color lookup — "show me figures I can fully complete with these spools"
- Draggable color sequence — suggested optimal order with user override
- Multi-color AND/OR filtering — compound color filters for discovery
- Bulk add to queue — select multiple catalog figures in one action
- Queue quantity badges — same figure + same size = x2 badge
- Partial reprint support — re-mark individual colors on in-progress figures
- Near-completion nudge — visual distinction for figures with only 1-2 colors remaining, surfacing quick wins

### Risk Mitigation Strategy

**Technical Risks:**
- **IndexedDB as sole persistence:** Mitigated by always-visible JSON export. The user is trained to export regularly through UI prominence. Import is tested to be a complete restore.
- **Live catalog-to-queue binding complexity:** Mitigated by keeping the data model simple — queue items reference catalog figure IDs, and color chips are derived from the catalog at render time. No denormalization, no sync logic. Note: Phase 2 color overrides will require evolving this model to store colors on queue items; this is an accepted future migration.
- **State consistency:** Mitigated by using in-memory state as source of truth. IndexedDB is a persistence layer, not a query layer. All derived state (ranking, progress) is computed from memory on every render.

**Market Risks:**
- Not applicable. This is a personal tool. The only market is one user.

**Resource Risks:**
- **Solo developer bottleneck:** Mitigated by choosing a well-known stack (React + Tailwind + shadcn/ui), using pre-built UI components, and keeping the architecture simple (no backend, no auth, no deployment complexity). Occasional colleague contributions can handle isolated features without deep context.
- **Scope creep:** Mitigated by the clear MVP/Growth/Vision split. Growth and Vision features are additive — they don't require refactoring MVP code (with the noted exception of color overrides). The MVP is self-contained and complete.

## Functional Requirements

### Filament Spool Management

- **FR1:** User can create a new filament spool with a name and hex color value
- **FR2:** User can view all spools in a visual library showing each spool's name and color preview
- **FR3:** User can edit an existing spool's name and hex color
- **FR4:** User can delete a spool only if it is not referenced by any figure; the system informs the user which figures reference it if deletion is blocked
- **FR5:** User can select a color using a hex color picker when creating or editing a spool

### Figure Catalog Management

- **FR6:** User can create a new figure with name, franchise tag, size (percentage of original model scale, default 60%, free-form numeric input), notes, and required colors (references to spools)
- **FR7:** User can view all figures in a catalog list
- **FR8:** User can edit an existing figure's name, franchise, size, notes, and assigned colors
- **FR9:** User can delete a figure from the catalog; deletion also removes all queue items referencing that figure, with a confirmation modal showing the impact
- **FR10:** User can assign one or more spools as required colors for a figure (deduplicated — one entry per unique spool)
- **FR11:** User can remove a spool assignment from a figure
- **FR12:** User can create a figure with zero colors (supports gradual catalog building)
- **FR13:** Editing a catalog figure's colors propagates to all queued instances of that figure in real-time (live binding)

### Print Queue Management

- **FR14:** User can add a figure from the catalog to the print queue
- **FR15:** When adding to queue, user can mark the item as stock or order
- **FR16:** Queue items inherit their color set from the catalog figure via live binding
- **FR17:** User can toggle a color chip on a queue item to mark that color as printed for that figure
- **FR18:** User can un-toggle a previously completed color chip (reversible, no confirmation needed)
- **FR19:** Each queue item displays a progress indicator showing completed vs. total colors
- **FR20:** When all color chips on a queue item are marked complete, the item moves to the completed section
- **FR21:** User can view all completed figures in a collapsible archive section
- **FR22:** User can re-queue a completed figure with one action ("print again"), resetting all color chips to incomplete using the catalog's current default colors
- **FR23:** User can remove a queue item from the queue (with confirmation for destructive action)

### Color-First Production Planning

- **FR24:** The home/default view displays a ranked list of filament colors sorted by the count of queued figures that still need each color (incomplete chips only)
- **FR25:** Order-flagged queue items surface above stock items within the color ranking
- **FR26:** Selecting a color in the ranking reveals all queued figures that have an incomplete chip for that color
- **FR27:** The color ranking recalculates immediately on every chip toggle, un-toggle, queue addition, or queue removal
- **FR28:** User can switch between Color view (home/default) and Figure view of the same queue data
- **FR29:** The Figure view displays all queued figures with their color chip progress

### Data Persistence & Portability

- **FR30:** Every data mutation (create, update, delete, chip toggle) auto-saves to persistent local storage
- **FR31:** User can export all app data (spools, figures, queue items with progress) as a single JSON file
- **FR32:** The export action is always visible in the app interface (not buried in settings)
- **FR33:** User can import a JSON file to restore all app data
- **FR34:** Import replaces all current data (full overwrite) and requires a confirmation modal before executing
- **FR35:** User sees all their previous data immediately upon opening the app, exactly as they left it
- **FR36:** If a data persistence operation fails, a non-blocking toast notification informs the user that changes are in memory but not yet saved, with a retry action available

### Navigation & App Structure

- **FR37:** User can navigate between all major sections of the app (queue views, catalog, spool library, completed section, data management) from a persistent navigation element

### Onboarding & Empty States

- **FR38:** When no spools exist, the app displays a contextual prompt guiding the user to create their first spool
- **FR39:** When no figures exist, the app displays a contextual prompt guiding the user to create their first figure
- **FR40:** When the queue is empty, the app displays a contextual prompt guiding the user to add figures to the queue
- **FR41:** Empty state prompts provide direct action buttons (not just text instructions)
- **FR42:** When editing a catalog figure that has active queue items, the edit form displays the count of queued items that will be affected before the user saves

## Non-Functional Requirements

### Performance

- **NFR1:** Color frequency ranking recalculates and renders within a single animation frame (~16ms) after any chip toggle, queue addition, or queue removal
- **NFR2:** All local CRUD operations (create, edit, delete spools/figures/queue items) reflect in the UI within a single animation frame
- **NFR3:** App initial load (bundle download + IndexedDB hydration + first render) completes in under 2 seconds on a modern laptop with broadband
- **NFR4:** The app remains responsive with up to 100 figures in the catalog, 30 spools, and 30 active queue items — no perceptible degradation at this scale
- **NFR5:** No operation displays a loading spinner. All local interactions are instant from the user's perspective

### Data Integrity & Reliability

- **NFR6:** Every data mutation triggers an IndexedDB write. No mutation is silently lost
- **NFR7:** If an IndexedDB write fails, the user is notified within 2 seconds of the failed operation
- **NFR8:** JSON export produces a file that, when imported, restores the exact state of all spools, figures, queue items, and chip progress
- **NFR9:** JSON import is atomic — either all data is replaced successfully, or the import fails and existing data remains unchanged
- **NFR10:** The app recovers gracefully from browser crashes or force-closes — on next load, all data persisted before the crash is available (no corruption from interrupted writes)
- **NFR11:** In-memory state and IndexedDB state never diverge during normal operation. If a read from IndexedDB returns different data than memory, memory is the source of truth for the current session
