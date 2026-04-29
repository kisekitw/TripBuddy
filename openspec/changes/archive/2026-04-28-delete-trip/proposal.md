## Why

Users can create trips but have no way to delete them. The DB layer already has `deleteTrip()` implemented — it just needs a UI surface.

## What Changes

- A delete button appears on each trip card (visible on hover)
- Clicking it shows a confirm dialog before deleting
- Confirmed deletion removes the trip from local state and syncs to Supabase (or localStorage for guests)
- The sample/demo trip cannot be deleted

## Capabilities

### New Capabilities
- `delete-trip`: User can delete a trip from the trips list with a confirmation step

### Modified Capabilities

## Impact

- `src/App.tsx`: Add delete handler + confirm dialog state + button in trip card JSX
