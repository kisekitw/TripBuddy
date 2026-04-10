/**
 * DL: 編輯天標籤（Day Label）
 * BDD Integration Tests — TDD Red → Green
 *
 * 前置條件：進入 SAMPLE_TRIP Editor，D1 標籤為「台北 → 杜拜」
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

// ── Helpers ──────────────────────────────────────────────────────
async function selectD1() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D1"));
  return user;
}

// ─────────────────────────────────────────────────────────────────
describe("DL: 編輯天標籤", () => {

  // ── TC-DL-01 ────────────────────────────────────────────────────
  describe("TC-DL-01 ｜ 點擊側欄天標籤出現可編輯輸入框", () => {
    /**
     * Given  D1 選取，側欄顯示「台北 → 杜拜」
     * When   點擊該標籤
     * Then   出現 text input（aria-label="編輯天標籤 D1"），原文消失
     */
    it("should show label input and hide text when label is clicked", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "編輯天標籤 D1" }));

      expect(screen.getByLabelText("編輯天標籤 D1")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "編輯天標籤 D1" })).not.toBeInTheDocument();
    });
  });

  // ── TC-DL-02 ────────────────────────────────────────────────────
  describe("TC-DL-02 ｜ 輸入新標籤後側欄更新", () => {
    /**
     * Given  標籤 input 已開啟（顯示「台北 → 杜拜」）
     * When   清除並輸入「台北 → 桃園機場」，按 Enter
     * Then   側欄出現「台北 → 桃園機場」，input 消失
     */
    it("should update sidebar label after entering new text and pressing Enter", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "編輯天標籤 D1" }));
      const input = screen.getByLabelText("編輯天標籤 D1");
      await user.clear(input);
      await user.type(input, "台北 → 桃園機場");
      await user.keyboard("{Enter}");

      expect(screen.getByRole("button", { name: "編輯天標籤 D1" })).toHaveTextContent("台北 → 桃園機場");
    });
  });

  // ── TC-DL-03 ────────────────────────────────────────────────────
  describe("TC-DL-03 ｜ 按 Escape 取消編輯", () => {
    /**
     * Given  標籤 input 已開啟
     * When   輸入任意文字後按 Escape
     * Then   原標籤「台北 → 杜拜」恢復，input 消失
     */
    it("should restore original label when Escape is pressed", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "編輯天標籤 D1" }));
      const input = screen.getByLabelText("編輯天標籤 D1");
      await user.clear(input);
      await user.type(input, "隨便輸入");
      await user.keyboard("{Escape}");

      expect(screen.getByRole("button", { name: "編輯天標籤 D1" })).toHaveTextContent("台北 → 杜拜");
    });
  });

  // ── TC-DL-04 ────────────────────────────────────────────────────
  describe("TC-DL-04 ｜ 主面板 header 同步顯示新標籤", () => {
    /**
     * Given  D1 選取，主面板顯示「台北 → 杜拜」
     * When   修改標籤為「測試標籤」並 Enter
     * Then   主面板 header 也顯示「測試標籤」
     */
    it("should update main panel header label after edit", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "編輯天標籤 D1" }));
      const input = screen.getByLabelText("編輯天標籤 D1");
      await user.clear(input);
      await user.type(input, "測試標籤");
      await user.keyboard("{Enter}");

      // Main panel header should also reflect the change
      expect(screen.getByTestId("day-label-header")).toHaveTextContent("測試標籤");
    });
  });
});
