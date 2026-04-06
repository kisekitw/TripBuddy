/**
 * E-6: cascade 調整後各景點的時間差異 badge（如 +30 分鐘）
 * BDD Integration Tests — TDD Red → Green
 *
 * 前置條件：進入 SAMPLE_TRIP Editor，選擇 D4（佛羅倫斯博物館日）
 *   - d1: 烏菲茲美術館, t=540 (09:00), d=180, tr=10
 *   - d2: 領主廣場/舊宮/野豬噴泉, t=730 (12:10), d=60, tr=5
 *   - d3: Osteria Nuvoli 午餐 (isA), t=795, d=90, tr=5
 *   - d4: 百花聖殿/洗禮堂, t=890
 *   - d5: 喬托鐘樓登頂, t=1045
 *   - d6: 電影院書店/老橋散步, t=1140
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

// ── Helpers ──────────────────────────────────────────────────────
async function selectD4() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D4"));
  return user;
}

// ─────────────────────────────────────────────────────────────────
describe("E-6: cascade delta badges", () => {

  // ── TC-E6-01 ────────────────────────────────────────────────────
  describe("TC-E6-01 ｜ 縮短停留時間後下游景點出現負數 delta badge", () => {
    /**
     * Given  D4 auto 模式，烏菲茲時長 180
     * When   改為 60（縮短 120 分鐘）
     * Then   d2~d6（共 5 個景點）各出現 "-120分鐘" delta badge
     */
    it("should show -120分鐘 delta badges for downstream spots after shortening duration", async () => {
      const user = await selectD4();

      await user.click(screen.getByRole("button", { name: "停留時長 烏菲茲美術館" }));
      const input = screen.getByLabelText("停留時長 烏菲茲美術館");
      await user.clear(input);
      await user.type(input, "60");
      await user.keyboard("{Enter}");

      const badges = screen.getAllByTestId("delta-badge");
      const negBadges = badges.filter((b) => b.textContent === "-120分鐘");
      expect(negBadges.length).toBe(5);
    });
  });

  // ── TC-E6-02 ────────────────────────────────────────────────────
  describe("TC-E6-02 ｜ 延長停留時間後下游景點出現正數 delta badge", () => {
    /**
     * Given  D4 auto 模式，烏菲茲時長 180
     * When   改為 240（延長 60 分鐘）
     * Then   d2~d6（共 5 個景點）各出現 "+60分鐘" delta badge
     */
    it("should show +60分鐘 delta badges for downstream spots after extending duration", async () => {
      const user = await selectD4();

      await user.click(screen.getByRole("button", { name: "停留時長 烏菲茲美術館" }));
      const input = screen.getByLabelText("停留時長 烏菲茲美術館");
      await user.clear(input);
      await user.type(input, "240");
      await user.keyboard("{Enter}");

      const badges = screen.getAllByTestId("delta-badge");
      const posBadges = badges.filter((b) => b.textContent === "+60分鐘");
      expect(posBadges.length).toBe(5);
    });
  });

  // ── TC-E6-03 ────────────────────────────────────────────────────
  describe("TC-E6-03 ｜ 修改開始時間後所有景點出現 delta badge", () => {
    /**
     * Given  D4 auto 模式，烏菲茲開始時間 09:00（t=540）
     * When   改為 09:30（t=570，+30 分鐘）
     * Then   d1~d6（共 6 個景點）各出現 "+30分鐘" delta badge
     */
    it("should show +30分鐘 delta badges for all spots after shifting start time", async () => {
      const user = await selectD4();

      await user.click(screen.getByRole("button", { name: "開始時間 烏菲茲美術館" }));
      const input = screen.getByLabelText("開始時間 烏菲茲美術館");
      await user.clear(input);
      await user.type(input, "09:30");
      await user.keyboard("{Enter}");

      const badges = screen.getAllByTestId("delta-badge");
      const posBadges = badges.filter((b) => b.textContent === "+30分鐘");
      expect(posBadges.length).toBe(6);
    });
  });

  // ── TC-E6-04 ────────────────────────────────────────────────────
  describe("TC-E6-04 ｜ 切換到另一天後 delta badge 消失", () => {
    /**
     * Given  D4 已做過一次時間修改（出現 badges）
     * When   點擊切換到 D1
     * Then   畫面上不再有任何 delta-badge
     */
    it("should clear all delta badges when switching to a different day", async () => {
      const user = await selectD4();

      // Trigger some deltas in D4
      await user.click(screen.getByRole("button", { name: "停留時長 烏菲茲美術館" }));
      const input = screen.getByLabelText("停留時長 烏菲茲美術館");
      await user.clear(input);
      await user.type(input, "60");
      await user.keyboard("{Enter}");

      // Verify badges are there first
      expect(screen.getAllByTestId("delta-badge").length).toBeGreaterThan(0);

      // Switch to D1
      await user.click(screen.getByText("D1"));

      expect(screen.queryAllByTestId("delta-badge").length).toBe(0);
    });
  });

  // ── TC-E6-05 ────────────────────────────────────────────────────
  describe("TC-E6-05 ｜ Lock 模式下修改時長不出現 delta badge", () => {
    /**
     * Given  D4，切換到 lock 模式
     * When   修改烏菲茲停留時長
     * Then   畫面上不出現任何 delta-badge
     */
    it("should not show delta badges in lock mode", async () => {
      const user = await selectD4();

      // Switch to lock mode
      await user.click(screen.getByRole("button", { name: "鎖定時間" }));

      await user.click(screen.getByRole("button", { name: "停留時長 烏菲茲美術館" }));
      const input = screen.getByLabelText("停留時長 烏菲茲美術館");
      await user.clear(input);
      await user.type(input, "60");
      await user.keyboard("{Enter}");

      expect(screen.queryAllByTestId("delta-badge").length).toBe(0);
    });
  });
});
