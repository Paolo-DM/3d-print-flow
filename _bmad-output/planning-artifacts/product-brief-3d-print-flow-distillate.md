---
title: "Product Brief Distillate: 3d-print-flow"
type: llm-distillate
source: "product-brief-3d-print-flow.md"
created: "2026-03-26"
purpose: "Token-efficient context for downstream PRD creation"
---

# Product Brief Distillate: 3D Print Flow

## Core Mental Model

- Colors = physical filament spools, not abstract labels — this anchors the entire data model, UX, and interaction design
- "Color-first scheduling" (or "spool-driven planning") is the named paradigm: organize production around minimizing filament swaps, not around figures or jobs
- Queue is home, not catalog — the app is action-first, showing what to do now, not what exists in the library
- The app is a tool, not an assistant — it provides situational awareness and gets out of the way; it never acts autonomously or makes suggestions

## Data Model Hints

- **Spool**: name, hex color — represents a physical filament spool; first-class entity, not a label
- **Figure** (catalog): name, franchise (filterable tag), default size, notes (permanent tips about printing this figure), required colors (list of spool references — one entry per unique spool needed, deduplicated)
- **Queue Item**: reference to catalog figure, colors for this job (inherits from catalog defaults but can be overridden per job for color variants), type (stock | order), optional order context (buyer name, platform, due date), per-color completion state (chip toggled or not), job notes (ephemeral, per-job)
- Figures can exist with zero colors — supports gradual catalog building and work-in-progress entries
- Live catalog-to-queue binding: queue items reference catalog figures, not snapshots — edits to catalog propagate globally
- Color override per queue item handles variants (same sculpt, different color scheme) without duplicating catalog entries
- Same figure + same size in queue = quantity badge (x2); different sizes = separate cards
- Two note layers: permanent figure notes (catalog-level tips) vs. ephemeral job notes (per queue item)

## Queue & Workflow Details

- Color frequency ranking algorithm: count of queued figures where at least one chip for that color is not yet marked complete; orders surface above stock items
- Per-figure color chip toggle: one chip per unique spool; tap to mark as printed; progress bar fills; all done → figure moves to completed section
- Completed section is collapsible archive with "print again" one-tap re-queue (re-queues with catalog's current default colors)
- Triple queue view: Color view (home/default, ranked by frequency), Figure view (all figures + progress), Timeline view (production sequence)
- Reverse color lookup: "I have these spools loaded — show me figures I can fully complete right now"
- Draggable color sequence: app suggests optimal print order, user can drag to override
- Multi-color AND/OR filtering for discovery
- Bulk add to queue from catalog
- Order items: stock vs. order flag; orders carry optional buyer name, platform (Vinted/Subito.it), due date; orders get priority in color ranking

## UX Principles (Non-Negotiable)

- Instant visual feedback on every action — no loading spinners for local operations
- Zero confirmation modals for reversible actions; confirmation modals only for destructive actions (delete spool, clear queue, import data)
- Mobile-first: user has phone in hand at the printer; desktop for planning/bulk operations; both must work; responsive design required
- Replace paper, not replicate it — every feature must provide value paper can't
- Empty state onboarding: app teaches itself through clear CTAs when sections are empty
- Data persistence is sacred: IndexedDB auto-save on every mutation
- JSON export is first-class: always-visible action, not buried in settings; serves as backup, cross-device transfer, and pre-change snapshot
- JSON import replaces all data (full overwrite) with confirmation modal
- One tap for reversible, modal for destructive — no middle ground
- Safe color/figure deletion: check all references (queue items, figures) before deletion; show affected items in confirmation

## Rejected Ideas & Anti-Features (Do Not Re-Propose)

- **No analytics / dashboards** — analytics live in spreadsheets or a future separate tool; this app stays focused on production
- **No auto-suggestions / AI recommendations** — the app serves user decisions, never makes them; no "you should print this next" intelligence
- **No filament inventory/weight tracking** — user knows their shelf; tracking grams remaining is a different tool (Spoolman exists for this)
- **No printer integration / slicer connectivity** — out of scope; the app manages the queue, not the printer
- **No PWA / offline support** — user accesses via browser on both devices
- **No cloud sync / backend** — personal tool, IndexedDB + JSON export is sufficient
- **No theme toggle** — use existing design system (shadcn/ui semantic tokens)

## Technical Context

- React 19 + React Router v7 (file-based routing, SSR via react-router-serve)
- TypeScript strict mode — no `any` without documentation
- Tailwind CSS v4 + shadcn/ui with semantic color tokens from app.css
- React Compiler enabled (babel-plugin-react-compiler) — no manual useMemo/useCallback/React.memo
- Vite 7 build tool, ESLint (react-hooks recommended-latest), Prettier with tailwindcss plugin
- IndexedDB for persistence (via lightweight wrapper like idb-keyval) — chosen over LocalStorage for no 5MB limit and native structured data support
- Minimal useEffect philosophy: derive state during render, use event handlers and Router loaders
- File organization: routes in app/routes/, components in app/components/, utilities in app/lib/

## Competitive Landscape (Key Gaps This App Fills)

- **SimplyPrint**: cloud printer fleet management — no color-change optimization, designed for multi-printer farms not single-operator workflow
- **Spoolman/Spoolstock**: filament inventory tracking (weight, brand, material) — tracks what you have, not what to print next; no production queue concept
- **3DPrintOps**: quoting + job tracking + customer management — oriented toward print-service-bureau workflows, no color-frequency analysis
- **Filametrics**: Kanban + material forecasting — focused on consumption forecasting, not print-order optimization around color changes
- No existing tool treats "color = scheduling axis" — this is the core differentiator

## Market Context Worth Knowing

- Desktop 3D printing growing ~16% CAGR; entry-level printers surpassed 1M global shipments in Q1 2025
- Affordable multi-color systems (Bambu AMS, Prusa MMU) have made color-change management a mainstream pain point
- Etsy's 2025 crackdown on non-original 3D prints is pushing sellers to alternative marketplaces (Vinted, Subito.it)
- Multi-color printing generates significant waste from filament changes — batching by color has measurable economic value
- Community tracks filament in spreadsheets and ad-hoc tools — no dominant purpose-built solution exists for this niche
- IP/licensing consideration: anime/pop-culture figures may involve unlicensed reproductions; awareness item, not blocking

## Open Questions for PRD

- Timeline view: what specific data does it show beyond what Color and Figure views already provide? Needs UX definition
- Draggable color sequence: what algorithm drives the initial suggested order? Simple frequency count, or something smarter (e.g., minimize total swaps across the full queue)?
- Color matching model: are colors matched by spool identity (object reference) or hex value (exact match)? Affects how near-duplicate colors (two slightly different reds from different brands) behave in the ranking
- Partial reprint support: when a print fails mid-job, how does the user re-mark a single color as "needs reprinting" on an otherwise in-progress figure?
- Catalog search: full-text across name + franchise, or more structured filtering?
