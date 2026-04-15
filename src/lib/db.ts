import { supabase } from "./supabase";
import type { Trip, Day } from "../types";

export async function fetchTrips(userId: string): Promise<{ trip: Trip; days: Day[] }[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("id, title, dest, dates, img, days")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    trip: { id: row.id, title: row.title, dest: row.dest, dates: row.dates, img: row.img },
    days: row.days as Day[],
  }));
}

export async function upsertTrip(userId: string, trip: Trip, days: Day[]): Promise<void> {
  const { error } = await supabase.from("trips").upsert({
    id: trip.id,
    user_id: userId,
    title: trip.title,
    dest: trip.dest ?? null,
    dates: trip.dates,
    img: trip.img,
    days,
  });
  if (error) throw error;
}

export async function deleteTrip(userId: string, tripId: number): Promise<void> {
  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** LB: Generate a 6-char alphanumeric binding code (expires in 10 min) */
export async function generateBindingCode(userId: string): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars → 256 % 32 === 0, no modulo bias
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("line_binding_codes")
    .upsert({ code, user_id: userId, expires_at: expiresAt });
  if (error) throw error;
  return code;
}

/** LB: Return the bound LINE user ID for this user, or null if not bound */
export async function getLineBinding(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_line_bindings")
    .select("line_user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.line_user_id ?? null;
}
