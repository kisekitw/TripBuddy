# delete-trip Specification

## Purpose
TBD - created by archiving change delete-trip. Update Purpose after archive.
## Requirements
### Requirement: Delete button on trip cards

Each trip card (except the sample/demo trip) SHALL show a delete button that is visible on hover.

#### Scenario: Delete button is visible on hover

- **WHEN** the user hovers over a trip card that is not the sample trip
- **THEN** a delete button MUST be visible on the card

#### Scenario: Sample trip cannot be deleted

- **WHEN** the trip card is the sample/demo trip
- **THEN** no delete button SHALL be shown

---

### Requirement: Confirm before deleting

The system SHALL require confirmation before removing any trip. Clicking the delete button MUST open a confirmation dialog before any data is removed.

#### Scenario: Confirmation dialog appears

- **WHEN** the user clicks the delete button on a trip card
- **THEN** a confirm dialog MUST appear showing the trip title
- **AND** the trip SHALL NOT be deleted yet

#### Scenario: User cancels

- **WHEN** the user dismisses the confirm dialog
- **THEN** the trip SHALL remain in the list unchanged

---

### Requirement: Trip is removed on confirmation

The system SHALL remove the trip from state upon user confirmation and MUST sync the deletion appropriately based on auth status.

#### Scenario: Confirmed delete for authenticated user

- **WHEN** the user confirms deletion
- **AND** the user is authenticated (not guest)
- **THEN** the trip SHALL be removed from local state
- **AND** `dbDeleteTrip(userId, tripId)` MUST be called to sync with Supabase

#### Scenario: Confirmed delete for guest user

- **WHEN** the user confirms deletion
- **AND** the user is a guest
- **THEN** the trip SHALL be removed from local state only (no DB call)

