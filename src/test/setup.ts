import "@testing-library/jest-dom";
import { vi } from "vitest";

// Default global mock for supabase: no session, instant resolve.
// Tests that need custom behaviour (sb-auth-persistence) override this with their own vi.mock.
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOAuth: vi.fn().mockResolvedValue({}),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Default global mock for db: no cloud trips.
vi.mock("../lib/db", () => ({
  fetchTrips: vi.fn().mockResolvedValue([]),
  upsertTrip: vi.fn().mockResolvedValue(undefined),
  deleteTrip: vi.fn().mockResolvedValue(undefined),
}));
