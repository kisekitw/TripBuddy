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
