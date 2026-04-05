# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
