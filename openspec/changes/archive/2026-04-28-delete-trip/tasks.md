## 1. State & handler

- [x] 1.1 Add `deleteTripConfirmId` state (`number | null`) in `App.tsx`
- [x] 1.2 Add `handleDeleteTrip(tripId)` handler: updates `trips` + `tripDaysMap`, calls `dbDeleteTrip` for authenticated users

## 2. Confirm dialog

- [x] 2.1 Add confirm dialog modal at the bottom of the trips view JSX, shown when `deleteTripConfirmId !== null`

## 3. Delete button on cards

- [x] 3.1 Add hover-visible delete button overlay to the featured card (trips[0])
- [x] 3.2 Add hover-visible delete button overlay to the small cards grid (trips[1..])
- [x] 3.3 Skip the button when `tr.id === SAMPLE_TRIP.id`

## 4. Verify

- [x] 4.1 Can delete a user-created trip — confirm dialog appears, trip removed after confirmation
- [x] 4.2 Sample trip card has no delete button
- [x] 4.3 Cancelling the dialog leaves the trip intact
