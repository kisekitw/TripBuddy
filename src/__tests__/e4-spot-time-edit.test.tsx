/**
 * E-4: 直接修改景點時間與停留時長
 * BDD Integration Tests — TDD Red → Green
 *
 * 前置條件：進入 SAMPLE_TRIP Editor，選擇 D4（佛羅倫斯博物館日）
 *   - d1: 烏菲茲美術館, t=540 (09:00), d=180, tr=10
 *   - d2: 領主廣場/舊宮/野豬噴泉, t=730 (12:10)
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
describe("E-4: 直接修改景點時間與停留時長", () => {

  // ── TC-E4-01 ────────────────────────────────────────────────────
  describe("TC-E4-01 ｜ 點擊時間欄位出現可編輯輸入框", () => {
    /**
     * Given  D4 已選取，烏菲茲美術館 時間顯示為 "09:00"
     * When   點擊該時間按鈕
     * Then   出現可輸入的 text input，按鈕消失
     */
    it("should show time input and hide button when time is clicked", async () => {
      const user = await selectD4();

      await user.click(screen.getByRole("button", { name: "開始時間 烏菲茲美術館" }));

      expect(screen.getByLabelText("開始時間 烏菲茲美術館")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "開始時間 烏菲茲美術館" })).not.toBeInTheDocument();
    });
  });

  // ── TC-E4-02 ────────────────────────────────────────────────────
  describe("TC-E4-02 ｜ 修改開始時間後顯示新時間", () => {
    /**
     * Given  時間 input 已開啟（顯示 "09:00"）
     * When   清除並輸入 "10:00"，按 Enter
     * Then   按鈕恢復並顯示 "10:00"
     */
    it("should update displayed time after entering new time and pressing Enter", async () => {
      const user = await selectD4();

      await user.click(screen.getByRole("button", { name: "開始時間 烏菲茲美術館" }));
      const input = screen.getByLabelText("開始時間 烏菲茲美術館");
      await user.clear(input);
      await user.type(input, "10:00");
      await user.keyboard("{Enter}");

      expect(screen.getByRole("button", { name: "開始時間 烏菲茲美術館" })).toHaveTextContent("10:00");
    });
  });

  // ── TC-E4-03 ────────────────────────────────────────────────────
  describe("TC-E4-03 ｜ 點擊停留時長欄位出現可編輯輸入框", () => {
    /**
     * Given  D4 已選取，烏菲茲美術館 時長顯示 "180分鐘"
     * When   點擊該時長按鈕
     * Then   出現 number input，按鈕消失
     */
    it("should show duration input and hide button when duration is clicked", async () => {
      const user = await selectD4();

      await user.click(screen.getByRole("button", { name: "停留時長 烏菲茲美術館" }));

      expect(screen.getByLabelText("停留時長 烏菲茲美術館")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "停留時長 烏菲茲美術館" })).not.toBeInTheDocument();
    });
  });

  // ── TC-E4-04 ────────────────────────────────────────────────────
  describe("TC-E4-04 ｜ 修改時長後 cascade 調整下游景點時間", () => {
    /**
     * Given  D4, auto 模式
     * When   將烏菲茲美術館時長從 180 改為 60
     * Then   領主廣場/舊宮/野豬噴泉 時間從 12:10 變為 10:10
     *        （cascade: 09:00 + 60min + 10min transit = 10:10）
     */
    it("should cascade-update downstream spot times in auto mode", async () => {
      const user = await selectD4();

      // Verify initial state of downstream spot
      expect(screen.getByRole("button", { name: "開始時間 領主廣場/舊宮/野豬噴泉" })).toHaveTextContent("12:10");

      await user.click(screen.getByRole("button", { name: "停留時長 烏菲茲美術館" }));
      const input = screen.getByLabelText("停留時長 烏菲茲美術館");
      await user.clear(input);
      await user.type(input, "60");
      await user.keyboard("{Enter}");

      expect(screen.getByRole("button", { name: "開始時間 領主廣場/舊宮/野豬噴泉" })).toHaveTextContent("10:10");
    });
  });

  // ── TC-E4-05 ────────────────────────────────────────────────────
  describe("TC-E4-05 ｜ 輸入無效時間格式不更新", () => {
    /**
     * Given  時間 input 已開啟（顯示 "09:00"）
     * When   輸入非法時間 "25:00"，按 Enter
     * Then   時間按鈕恢復並仍顯示 "09:00"
     */
    it("should not update time when invalid value is entered", async () => {
      const user = await selectD4();

      await user.click(screen.getByRole("button", { name: "開始時間 烏菲茲美術館" }));
      const input = screen.getByLabelText("開始時間 烏菲茲美術館");
      await user.clear(input);
      await user.type(input, "25:00");
      await user.keyboard("{Enter}");

      expect(screen.getByRole("button", { name: "開始時間 烏菲茲美術館" })).toHaveTextContent("09:00");
    });
  });
});
