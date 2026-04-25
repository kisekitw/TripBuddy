export interface Spot {
  id: string;
  nm: string;        // name
  t: number;         // start time in minutes from midnight
  d: number;         // duration in minutes
  tr: number;        // transit time to next spot
  type?: "spot" | "transit"; // item type (default: "spot")
  la: number;        // latitude
  ln: number;        // longitude
  cl?: number;       // closing time (hard constraint)
  sa?: number;       // soft-after (best after this time)
  sb?: number;       // soft-before (best before this time)
  nt?: string;       // note
  isA?: boolean;     // is alternative slot
  ao?: AltOption[];  // alternative options
  si?: number;       // selected alternative index
  // T-2: cross-midnight transit
  nextDayArrival?: number;   // arrival time (minutes), defined = this is a departure card
  isArrival?: boolean;       // true = auto-generated arrival card
  linkedSpotId?: string;     // links departure ↔ arrival cards
  // T-3: timezone-aware transit
  tzOffset?: number;         // destination UTC offset − departure UTC offset (e.g. Taipei→Dubai = -4)
  dep?: string;              // departure IATA airport code
  dest?: string;             // destination IATA airport code
}

export interface AltOption {
  id: string;
  nm: string;
  d: number;
  tr: number;
}

export interface DayVariant {
  lb: string;        // label
  sp: Spot[];        // spots
}

export interface Day {
  id: number;
  n: number;         // day number
  dt: string;        // date display
  st: "c" | "u";     // status: confirmed | uncertain
  lb: string;        // label
  sp: Spot[];        // spots (for confirmed days)
  ur?: string;       // uncertainty reason
  vs?: DayVariant[]; // variants (for uncertain days)
  av?: number;       // active variant index
}

export interface Trip {
  id: number;
  title: string;
  dest?: string;
  dates: string;
  startDate?: string;   // ISO format: "2026-04-25"
  img: string;
}

export interface User {
  name: string;
  avatar: string;
  email?: string;
  id?: string;       // Supabase auth.user.id (UUID)
}
