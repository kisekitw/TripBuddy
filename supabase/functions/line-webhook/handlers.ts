import { createAdminClient } from "../_shared/supabase-admin.ts";
import { replyMessage } from "./line-api.ts";
import { detectIntent } from "./intent.ts";

// ── Types (minimal subset of what's stored in the trips JSONB) ──────────────
interface Spot {
  id: string;
  nm: string;
  t: number;   // minutes from midnight
  d: number;   // duration minutes
  tr: number;
  la: number;
  ln: number;
  type?: string;
}

interface Day {
  id: number;
  n: number;
  dt: string;  // e.g. "8/12 三"
  lb?: string;
  sp: Spot[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tToHHMM(t: number): string {
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDuration(d: number): string {
  const h = Math.floor(d / 60);
  const m = d % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

/** Parse day date string like "8/12 三" into { month, day } */
function parseDayDate(dt: string): { month: number; day: number } | null {
  const m = dt.match(/(\d+)\/(\d+)/);
  if (!m) return null;
  return { month: parseInt(m[1]), day: parseInt(m[2]) };
}

/** Return upcoming spots for today (t > current minutes from midnight) */
async function findUpcomingSpots(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ spots: Spot[]; dayLabel: string } | null> {
  const { data, error } = await supabase
    .from("trips")
    .select("days")
    .eq("user_id", userId);

  if (error) { console.error("findUpcomingSpots error:", error.message); return null; }
  if (!data || data.length === 0) return null;

  const now = new Date();
  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (const row of data) {
    const days: Day[] = row.days ?? [];
    for (const day of days) {
      const parsed = parseDayDate(day.dt);
      if (!parsed) continue;
      if (parsed.month === nowMonth && parsed.day === nowDay) {
        const upcoming = (day.sp ?? []).filter(
          (s) => s.type !== "transit" && s.t > nowMinutes,
        );
        const label = day.lb ? `D${day.n} ${day.lb}` : `D${day.n}`;
        return { spots: upcoming, dayLabel: label };
      }
    }
  }
  return null;
}

/** Look up user_id from LINE user ID via user_line_bindings */
async function findUserId(
  supabase: ReturnType<typeof createAdminClient>,
  lineUserId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_line_bindings")
    .select("user_id")
    .eq("line_user_id", lineUserId)
    .maybeSingle();
  if (error) console.error("findUserId error:", error.message);
  return data?.user_id ?? null;
}

// ── Format replies ────────────────────────────────────────────────────────────

function replyItinerary(spots: Spot[], dayLabel: string): string {
  if (spots.length === 0) {
    return `📅 今日剩餘行程（${dayLabel}）\n\n今天的景點都結束了！好好休息 😊`;
  }
  const lines = spots.map((s) => `${tToHHMM(s.t)} ${s.nm}（${formatDuration(s.d)}）`);
  return `📅 今日接下來行程（${dayLabel}）\n\n${lines.join("\n")}\n\n共 ${spots.length} 個景點。Have a great trip! 🚀`;
}

function replyCrowd(spot: Spot): string {
  const url = `https://maps.google.com/?q=${spot.la},${spot.ln}`;
  return `🗺 查看${spot.nm}目前人潮：\n${url}\n\n（點開後可見各時段人潮預估圖）`;
}

function replyNavigation(spot: Spot): string {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.la},${spot.ln}&travelmode=transit`;
  return `🧭 前往下一個景點：${spot.nm}\n\n👉 ${url}\n\n（若已分享位置，路線從你的位置出發）`;
}

const NOT_BOUND_MSG = `❗ 尚未綁定 TripBuddy 帳號。\n\n請在 TripBuddy 網頁點擊「綁定 LINE Bot」，\n取得綁定碼後發送 /link {碼} 給我。`;
const NO_ITINERARY_MSG = `📭 今天沒有找到對應的行程。\n請確認 TripBuddy 中有包含今天日期的行程。`;
const UNKNOWN_MSG = `😊 你好！我是 TripBuddy Bot。\n\n可以問我：\n• 「接下來行程是?」\n• 「怎麼去下一個景點」\n• 「人潮如何」`;
const BIND_SUCCESS = (lineUserId: string) =>
  `✅ 綁定成功！\n\nLINE ID: ${lineUserId}\n\n現在可以問我「接下來行程是?」來查詢今日行程 🗓`;

// ── Main event handler ────────────────────────────────────────────────────────

export async function handleMessage(event: {
  replyToken: string;
  source: { userId: string };
  message: { type: string; text?: string };
}): Promise<void> {
  const supabase = createAdminClient();
  const lineUserId = event.source.userId;
  const replyToken = event.replyToken;

  // Handle location messages
  if (event.message.type === "location") {
    const userId = await findUserId(supabase, lineUserId);
    if (!userId) { await replyMessage(replyToken, NOT_BOUND_MSG); return; }
    const data = await findUpcomingSpots(supabase, userId);
    if (!data || data.spots.length === 0) { await replyMessage(replyToken, NO_ITINERARY_MSG); return; }
    await replyMessage(replyToken, replyNavigation(data.spots[0]));
    return;
  }

  if (event.message.type !== "text" || !event.message.text) return;

  const text = event.message.text.trim();
  const { intent, code } = detectIntent(text);

  // /link binding flow
  if (intent === "link") {
    if (!code) {
      await replyMessage(replyToken, "❗ 請提供綁定碼，格式：/link ABC123");
      return;
    }
    const { data: bindCode, error } = await supabase
      .from("line_binding_codes")
      .select("user_id, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (error || !bindCode) {
      await replyMessage(replyToken, "❗ 綁定碼無效或已過期，請重新取得。");
      return;
    }
    if (new Date(bindCode.expires_at) < new Date()) {
      await replyMessage(replyToken, "❗ 綁定碼已過期（10 分鐘有效），請重新取得。");
      return;
    }

    await supabase.from("user_line_bindings").upsert({
      user_id: bindCode.user_id,
      line_user_id: lineUserId,
    });
    await supabase.from("line_binding_codes").delete().eq("code", code);
    await replyMessage(replyToken, BIND_SUCCESS(lineUserId));
    return;
  }

  // All other intents require binding
  const userId = await findUserId(supabase, lineUserId);
  if (!userId) { await replyMessage(replyToken, NOT_BOUND_MSG); return; }

  if (intent === "itinerary") {
    const data = await findUpcomingSpots(supabase, userId);
    if (!data) { await replyMessage(replyToken, NO_ITINERARY_MSG); return; }
    await replyMessage(replyToken, replyItinerary(data.spots, data.dayLabel));
    return;
  }

  if (intent === "crowd" || intent === "navigation") {
    const data = await findUpcomingSpots(supabase, userId);
    if (!data || data.spots.length === 0) { await replyMessage(replyToken, NO_ITINERARY_MSG); return; }
    const reply = intent === "crowd"
      ? replyCrowd(data.spots[0])
      : replyNavigation(data.spots[0]);
    await replyMessage(replyToken, reply);
    return;
  }

  await replyMessage(replyToken, UNKNOWN_MSG);
}
