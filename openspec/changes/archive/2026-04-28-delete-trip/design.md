## Context

The trips list in `App.tsx` renders a featured card (`trips[0]`) and a small card grid (`trips[1..]`). Users can create trips but cannot delete them. `dbDeleteTrip(userId, tripId)` exists in `src/lib/db.ts` and is already imported in `App.tsx` but never called.

## Goals / Non-Goals

**Goals:**
- Let users delete any trip except the sample trip
- Require confirmation before deletion
- Sync deletion to Supabase for authenticated users; local-only for guests

**Non-Goals:**
- Undo/restore after deletion
- Bulk delete
- Deleting the sample/demo trip

## Decisions

### Decision 1: Confirm via inline modal, not browser confirm()

Use the existing modal pattern already in the codebase (same style as delete-day confirm). Add a `deleteTripConfirmId` state — `null` means closed, a trip ID means "awaiting confirmation for this trip".

### Decision 2: Delete button placement

Overlay the button in the top-right corner of the card cover image, shown on CSS hover (opacity transition). Use `e.stopPropagation()` so clicking it doesn't also open the trip.

### Decision 3: Guest path skips DB call

Mirror the pattern used by `upsertTrip`: check `isGuest` before calling `dbDeleteTrip`. For guests, only update local state (`setTrips`, `setTripDaysMap`).

### Decision 4: Apply to both featured card and small cards

Both card layouts need the delete button overlay — same implementation, copy-pasted to match each card's existing structure.
