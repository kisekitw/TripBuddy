/**
 * M-5: Google Directions API utility
 * Fetches real driving duration between two coordinates.
 * Returns duration in minutes, or null if unavailable.
 */
export async function fetchTransitMinutes(
  from: [number, number],
  to: [number, number],
  apiKey: string,
): Promise<number | null> {
  if (!apiKey) return null;
  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${from[0]},${from[1]}` +
    `&destination=${to[0]},${to[1]}` +
    `&mode=driving&key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const durationSec: number | undefined =
      data?.routes?.[0]?.legs?.[0]?.duration?.value;
    if (durationSec === undefined) return null;
    return Math.round(durationSec / 60);
  } catch {
    return null;
  }
}
