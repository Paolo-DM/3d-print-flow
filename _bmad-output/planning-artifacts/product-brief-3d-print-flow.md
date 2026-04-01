---
title: "Product Brief: 3D Print Flow"
status: "complete"
created: "2026-03-26"
updated: "2026-03-26"
inputs:
  - "_bmad-output/brainstorming/brainstorming-session-2026-03-25-1200.md"
  - "_bmad-output/project-context.md"
---

# Product Brief: 3D Print Flow

## Executive Summary

3D Print Flow is a lightweight web app that answers the single most important question for a small-scale 3D printing business: **"I'm about to print — which filament should I load, and what figures can I knock out with it?"**

Today, managing a multi-color printing queue means juggling mental notes, spreadsheets, and gut feel to decide which filament spool to load next. Every unnecessary color change costs time, wastes filament, and slows production. 3D Print Flow flips the workflow: instead of thinking figure-first ("what does this figure need?"), it thinks color-first ("what can I print with this spool?"). The result is a production tool that minimizes filament swaps, maximizes batch efficiency, and replaces paper-and-spreadsheet tracking with a purpose-built interface.

The app is built for a single user managing a small figure-printing business selling on marketplaces like Vinted and Subito.it. No backend, no accounts, no infrastructure — just a React web app with IndexedDB for local persistence and JSON export for backup and cross-device transfer.

## The Problem

Running a small 3D printing business that sells multi-color figures involves a constant production puzzle:

- **Color changes are expensive.** Each filament swap means stopping the printer, unloading, loading, purging, and recalibrating. With figures requiring 3-6 colors each and a queue of 10-20 figures, the order you print in matters enormously.
- **No tool thinks in colors.** Existing 3D print management tools (SimplyPrint, Spoolman, 3DPrintOps) organize around printers, jobs, or filament inventory. None of them answer "given the spool I have loaded, what should I print next?"
- **The current workflow is manual.** Production planning lives in the operator's head, on paper, or in a spreadsheet. This works until the queue grows, orders pile up, and the mental overhead becomes the bottleneck.
- **Two competing modes.** Some days you're stocking up inventory (print popular figures proactively). Other days you're fulfilling specific customer orders with deadlines. Both need to coexist in one queue with clear priorities.

## The Solution

3D Print Flow is a color-first production tracker with three core capabilities:

**1. Color Frequency Ranking (the killer feature)**
The home screen shows a ranked list of filament colors sorted by how many queued figures still need them (only counting figures where that color's chip is not yet marked complete). Pick the top color, load that spool, and see every figure you can advance. This single view turns chaotic production into an optimized sequence.

**2. Per-Figure Color Chip Toggle**
Each figure in the queue shows its required colors as tappable chips. Tap a chip to mark that color as printed for that figure. A progress bar fills as colors complete. When all chips are done, the figure moves to "completed." This is the primary interaction — fast, visual, satisfying.

**3. Triple Queue View**
The same queue data, viewed three ways:
- **Color view** (home/default) — see all colors ranked by frequency and which figures need them
- **Figure view** — see all queued figures and their color progress
- **Timeline view** — see the production sequence and what's coming next

**4. Order Context & Priority**
Queue items carry a type — **stock** (building inventory) or **order** (fulfilling a customer request). Orders have optional buyer name, platform (Vinted/Subito.it), and due date. Order items surface above stock items in the color ranking, so deadline-driven work gets done first without losing the color-optimization benefit.

Supporting these are straightforward catalog management features: create and manage figures (name, franchise, default size, notes, required colors) and filament spools (name, hex color). Each figure has one chip per unique filament spool it requires — colors are deduplicated per figure (if a figure uses red in multiple places, that's one "red" chip, meaning one spool load). The catalog defines the default color set for a figure; when adding to queue, colors can be overridden per job to handle color variants (e.g., a different color scheme for the same sculpt) without duplicating catalog entries.

## What Makes This Different

**Color is the scheduling axis.** Every competitor organizes around printers or jobs. 3D Print Flow is the only tool that treats physical filament spools as the primary dimension for production planning. This isn't a feature — it's a fundamentally different mental model.

**It replaces paper, not replicates it.** The app doesn't digitize a spreadsheet. It provides views and interactions that paper can't — ranked color frequency, one-tap color completion, automatic progress tracking, and filtered discovery ("show me all Dragon Ball figures that need black").

**Full situational awareness, zero automation.** The app gives the user complete visibility into their queue and gets out of the way. No analytics dashboards, no AI suggestions, no filament inventory tracking, no printer integration. The user always knows exactly what state the app is in because the app never acts autonomously. This is a tool that serves your decisions — it never tries to make them for you.

## Who This Serves

**Primary user:** A single operator running a small 3D printing business from home, selling figures on online marketplaces. Prints multi-color figures (anime, gaming, pop culture) using desktop FDM printers. Works with a catalog of 20-100+ figure designs, a queue of 5-30 active print jobs, and a collection of 10-30 filament spools in various colors.

**Usage context:** Phone in hand at the printer (mobile-first interactions), desktop at the desk for planning and catalog management. Both must work well — responsive design is non-negotiable.

## Success Criteria

The app succeeds when it becomes the daily driver for production planning — specifically:

- **Core loop works smoothly:** Adding figures and colors to the catalog, building and managing the print queue, and marking progress are all fast and frictionless.
- **Color-first planning is instant:** The user can identify the optimal next spool to load in under 10 seconds by glancing at the ranked color list — no spreadsheet, no memory, no second-guessing.
- **Data is safe:** IndexedDB auto-save on every action. JSON export is a first-class, always-visible action (not buried in settings) — it's the backup, the cross-device transfer mechanism, and the "snapshot before a big change" safety net. No data loss, ever.

## Scope

**Scope — Full Feature Set:**
- Filament spool management (CRUD, hex color picker)
- Figure catalog management (CRUD, franchise tags, multiple colors per figure)
- Print queue (add from catalog, color chip toggle, completion flow)
- Queue item types: stock vs. order, with optional buyer/platform/due date for orders
- Order-priority-aware color frequency ranking (orders surface first) as home/default view
- Triple queue view: color view, figure view, timeline view
- Color override per queue item (customize colors for variants without catalog duplication)
- Reverse color lookup — "I have these spools, what can I fully print?"
- Multi-color AND/OR filtering
- Draggable color sequence — app suggests optimal order, user can override
- Bulk add to queue
- Completed figures section (collapsible archive, with "print again" re-queue action)
- IndexedDB persistence with auto-save
- JSON export/import for backup and cross-device transfer (import replaces all data, with confirmation)
- Responsive design (mobile + desktop)

**Out of scope:**
- PWA / offline support
- Any form of cloud sync or backend
- Analytics, reporting, or business intelligence
- Printer integration or slicer connectivity

**Never building:**
- Auto-suggestions or AI recommendations
- Filament inventory/weight tracking
- Analytics dashboards

## Vision

A complete, focused production tool that makes a single operator's printing day as efficient as possible. Color-first planning, full queue management with order priority, reverse lookups, smart filtering, and drag-to-reorder — all in one app, all from day one. The goal is a finished product that fully replaces paper, spreadsheets, and mental overhead. Not a print farm platform, not a business suite — just the best possible tool for "what should I print next?"
