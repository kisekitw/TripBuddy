/**
 * LB: LINE Bot 雙向對話
 * TDD Unit Tests (pure functions only — no network, no Edge Function) — Red → Green
 */
import { describe, it, expect } from "vitest";
import { detectIntent } from "../utils/lineBotReply";
import { formatItineraryReply, formatNavigationReply } from "../utils/lineBotReply";
import type { Spot } from "../types";

const sampleSpots: Spot[] = [
  { id: "s1", nm: "烏菲茲美術館", t: 540, d: 180, tr: 10, la: 43.7686, ln: 11.2553 },
  { id: "s2", nm: "領主廣場",     t: 730, d: 60,  tr: 5,  la: 43.7697, ln: 11.2558 },
  { id: "s3", nm: "聖母百花大教堂", t: 855, d: 120, tr: 0,  la: 43.7731, ln: 11.2560 },
];

// ── TC-LB-01 ─────────────────────────────────────────────────────
describe("TC-LB-01 ｜ detectIntent — 行程查詢", () => {
  /**
   * Given  用戶傳送「接下來行程是?」
   * When   detectIntent(text)
   * Then   intent === "itinerary"
   */
  it("should detect itinerary intent from Chinese keywords", () => {
    expect(detectIntent("接下來行程是?").intent).toBe("itinerary");
    expect(detectIntent("今天行程").intent).toBe("itinerary");
    expect(detectIntent("next itinerary").intent).toBe("itinerary");
  });
});

// ── TC-LB-02 ─────────────────────────────────────────────────────
describe("TC-LB-02 ｜ detectIntent — 人潮查詢", () => {
  /**
   * Given  用戶傳送「人潮如何」
   * When   detectIntent(text)
   * Then   intent === "crowd"
   */
  it("should detect crowd intent from Chinese keywords", () => {
    expect(detectIntent("人潮如何").intent).toBe("crowd");
    expect(detectIntent("那邊人多嗎").intent).toBe("crowd");
    expect(detectIntent("how busy is it").intent).toBe("crowd");
  });
});

// ── TC-LB-03 ─────────────────────────────────────────────────────
describe("TC-LB-03 ｜ detectIntent — 導航查詢", () => {
  /**
   * Given  用戶傳送「怎麼去下一個景點」
   * When   detectIntent(text)
   * Then   intent === "navigation"
   */
  it("should detect navigation intent from Chinese keywords", () => {
    expect(detectIntent("怎麼去下一個景點").intent).toBe("navigation");
    expect(detectIntent("導航到這裡").intent).toBe("navigation");
    expect(detectIntent("navigate there").intent).toBe("navigation");
  });
});

// ── TC-LB-04 ─────────────────────────────────────────────────────
describe("TC-LB-04 ｜ detectIntent — 綁定碼", () => {
  /**
   * Given  用戶傳送「/link ABC123」
   * When   detectIntent(text)
   * Then   intent === "link", code === "ABC123"
   */
  it("should detect link intent and extract code", () => {
    const result = detectIntent("/link ABC123");
    expect(result.intent).toBe("link");
    expect(result.code).toBe("ABC123");
  });
});

// ── TC-LB-05 ─────────────────────────────────────────────────────
describe("TC-LB-05 ｜ formatItineraryReply — 含景點名與時間格式", () => {
  /**
   * Given  sampleSpots + dayLabel = "D4 佛羅倫斯博物館日"
   * When   formatItineraryReply(spots, dayLabel)
   * Then   含景點名、HH:MM 時間、及 dayLabel
   */
  it("should include spot names, times, and day label", () => {
    const reply = formatItineraryReply(sampleSpots, "D4 佛羅倫斯博物館日");
    expect(reply).toContain("烏菲茲美術館");
    expect(reply).toContain("領主廣場");
    expect(reply).toContain("D4 佛羅倫斯博物館日");
    // HH:MM format for t=540 (09:00)
    expect(reply).toContain("09:00");
    // duration of 180 min = 3h
    expect(reply).toContain("3h");
  });
});

// ── TC-LB-06 ─────────────────────────────────────────────────────
describe("TC-LB-06 ｜ formatNavigationReply — 含 Google Maps URL 與景點座標", () => {
  /**
   * Given  sampleSpots[0] (烏菲茲美術館, la=43.7686, ln=11.2553)
   * When   formatNavigationReply(spot)
   * Then   含 Google Maps directions URL 及座標
   */
  it("should include Google Maps URL with spot coordinates", () => {
    const reply = formatNavigationReply(sampleSpots[0]);
    expect(reply).toContain("google.com/maps/dir");
    expect(reply).toContain("43.7686");
    expect(reply).toContain("11.2553");
    expect(reply).toContain("烏菲茲美術館");
  });
});
