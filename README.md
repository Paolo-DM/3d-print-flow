# 3D Print Flow

A local-first web app for managing multi-color 3D printing workflows. Built entirely with AI agents using the [BMAD Method](https://docs.bmad-method.org/).

## What is this?

**3D Print Flow** answers a simple question: *"What can I print with the spool I have loaded right now?"*

Instead of planning by figure, it plans by color — showing a ranked list of filament colors sorted by queue demand. Load a spool, see everything you can print, tap color chips to mark progress.

No backend, no cloud, no accounts. Just IndexedDB persistence and JSON export.

## The Experiment

This project is an experiment in **AI-driven software development**. Every line of code was written by AI agents, orchestrated through the BMAD method — from initial brainstorming to shipped product.

### The BMAD Journey

| Phase | What happened | Key numbers |
|-------|--------------|-------------|
| **Analysis** | Brainstorming session with 5 ideation techniques | 47 ideas generated |
| **Planning** | PRD creation and validation | 42 FRs, 11 NFRs, 5/5 quality score |
| **Solutioning** | Architecture design, epic/story breakdown | 18 components, 4 epics, 19 stories |
| **Implementation** | Automated BMAD loop (create → dev → 3-pass code review) | 42 commits, all stories completed |

### Tools & Skills Used

- **BMAD Method** — `/bmad-brainstorming`, `/bmad-create-prd`, `/bmad-validate-prd`, `/bmad-create-architecture`, `/bmad-create-epics-and-stories`, `/bmad-dev-story`, `/bmad-code-review`, and more
- **`/bmad-generate-project-context`** — Constitutional document encoding coding standards (SOLID/DRY/KISS, strict TS, React Compiler, minimal useEffect)
- **`/frontend-design`** — Creative UI code generation for the visual overhaul
- **`/audit`** — Accessibility, performance, and theming quality checks
- **`/vercel-react-best-practices`** — React performance pattern validation
- **`/teach-impeccable`** — Persistent design context (brand personality, accessibility guidelines)
- **shadcn MCP Server** — Component discovery and installation
- **GitHub MCP Server** — Automated commits, pushes, PR creation, issue management

### Full Presentation

For a detailed, interactive walkthrough of the entire process, open the [BMAD Case Study Presentation](bmad-presentation.html) — a standalone HTML file you can view in any browser.

## Tech Stack

- **Framework:** React Router v7 (SSR, file-based routing)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Compiler:** React Compiler (automatic memoization)
- **State:** Zustand with IndexedDB persistence
- **Build:** Vite 7
- **Testing:** Vitest + Testing Library

## Getting Started

```bash
npm install
npm run dev
```

## License

MIT
