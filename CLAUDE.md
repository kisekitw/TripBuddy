# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Commands

```bash
npm run dev       # Start Vite dev server (localhost:5173)
npm run build     # TypeScript compile + Vite bundle
npm run lint      # ESLint check
npm run preview   # Preview production build
```

No test runner is configured yet.

## Architecture

**TripBuddy** is a client-side-only React + TypeScript SPA for trip planning with drag-and-drop itineraries. No backend, no database, no environment variables — all state is in-memory React state loaded from `src/data/sampleTrip.ts`.

### State & Routing

All application state lives in `App.tsx` (no Redux, no Context API). Navigation is state-driven via a `view` field (`"login" | "trips" | "editor"`), not React Router paths (React Router DOM is installed but routing is handled manually).

Key state: `days: Day[]`, `selDay: number | null`, `tMode: "auto" | "lock"`, `dragI: number | null`, `impOpen/impStep` for import modal.

### Views

- **Login** — Mock Google OAuth + guest login (`src/pages/LoginPage.tsx`)
- **Trips list** — Trip cards + import modal (3-stage: idle → parsing → done)
- **Editor** — 3-panel layout: sidebar (day list) + itinerary panel (spots with dnd-kit drag-and-drop) + map panel (`src/components/MapView.tsx`, SVG-based projected coordinate visualization)

### Key Concepts

- **Conflict detection** (`src/utils/index.ts`) — 4-level severity system for time/location conflicts between spots
- **Cascade time adjustment** — `tMode: "auto"` recalculates downstream spot times when a duration changes; `"lock"` freezes them
- **Uncertainty** — Spots and days can have alternatives (rendered with dashed borders); day-level backup plans
- **i18n** — `src/i18n/` with `zh-TW` and `en` translations, toggled via `LangSwitcher`

### Types

All TypeScript interfaces are in `src/types/index.ts`: `Trip`, `Day`, `Spot`, `Alternative`, conflict enums.

### Styling

TailwindCSS v4 via Vite plugin (`@tailwindcss/vite`). Color palette in `src/utils/colors.ts` — 8 rotating day colors plus semantic warning/error/success colors. Primary brand color: `#c8946d`.
