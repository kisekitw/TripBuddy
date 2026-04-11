/**
 * Alt Group Entry — 替代方案景點新增入口
 * BDD Integration Tests — TDD Red → Green
 *
 * TC-AG-01: 新增景點 modal 含「設為替代方案」checkbox
 * TC-AG-02: 勾選 checkbox 新增景點 → isA 卡片（虛線 + 替代方案 badge）
 * TC-AG-03: 編輯一般景點 → modal 底部顯示「轉為替代方案 →」，不顯示「← 轉回一般景點」
 * TC-AG-04: 點擊「轉為替代方案 →」→ 景點轉為 isA 卡片
 * TC-AG-05: 編輯已是 isA 的景點 → modal 底部顯示「← 轉回一般景點」，不顯示「轉為替代方案 →」
 * TC-AG-06: 點擊「← 轉回一般景點」→ 景點轉回一般卡片（無替代方案 badge）
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

// ── Helpers ──────────────────────────────────────────────────────

/** Login → open sample trip editor → click D1 (has regular spot) */
async function selectD1() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D1"));
  return user;
}

/** Login → open sample trip editor → click D4 (has isA spot "Osteria Nuvoli 午餐") */
async function selectD4() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D4"));
  return user;
}

// ─────────────────────────────────────────────────────────────────
describe("Alt Group Entry — 替代方案景點新增入口", () => {

  // ── TC-AG-01 ─────────────────────────────────────────────────────
  describe("TC-AG-01 ｜ 新增景點 modal 含「設為替代方案」checkbox", () => {
    /**
     * Given  Editor 已開啟，已選 D1
     * When   點擊「+ 新增景點」
     * Then   modal 出現，且含有「設為替代方案」checkbox
     */
    it("should show 'set as alternative group' checkbox in add spot modal", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "+ 新增景點" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("設為替代方案")).toBeInTheDocument();
    });
  });

  // ── TC-AG-02 ─────────────────────────────────────────────────────
  describe("TC-AG-02 ｜ 勾選 checkbox 新增景點後出現 isA 卡片", () => {
    /**
     * Given  新增景點 modal 已開啟
     * When   勾選「設為替代方案」，輸入名稱「草莓蛋糕」，點「新增」
     * Then   modal 關閉；景點卡片顯示「替代方案」badge 及「+」按鈕
     */
    it("should create isA spot with alternatives badge when checkbox is checked", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "+ 新增景點" }));
      await user.click(screen.getByLabelText("設為替代方案"));
      await user.type(screen.getByLabelText("景點名稱"), "草莓蛋糕");
      await user.click(screen.getByRole("button", { name: "新增" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("替代方案")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument();
    });
  });

  // ── TC-AG-03 ─────────────────────────────────────────────────────
  describe("TC-AG-03 ｜ 編輯一般景點 modal 底部有「轉為替代方案 →」，無「← 轉回一般景點」", () => {
    /**
     * Given  D1 已選取，有一般景點「桃園機場出發」
     * When   點擊「編輯景點 桃園機場出發」
     * Then   modal 底部顯示「轉為替代方案 →」；不顯示「← 轉回一般景點」
     */
    it("should show convert-to-alt button and hide convert-to-spot button for regular spot", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "編輯景點 桃園機場出發" }));

      expect(screen.getByRole("button", { name: "轉為替代方案 →" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "← 轉回一般景點" })).not.toBeInTheDocument();
    });
  });

  // ── TC-AG-04 ─────────────────────────────────────────────────────
  describe("TC-AG-04 ｜ 點擊「轉為替代方案 →」景點轉為 isA 卡片", () => {
    /**
     * Given  編輯景點「桃園機場出發」modal 已開啟
     * When   點擊「轉為替代方案 →」
     * Then   modal 關閉；景點卡片顯示「替代方案」badge，並有「+」按鈕
     */
    it("should convert regular spot to isA card when convert button is clicked", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "編輯景點 桃園機場出發" }));
      await user.click(screen.getByRole("button", { name: "轉為替代方案 →" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("替代方案")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument();
    });
  });

  // ── TC-AG-05 ─────────────────────────────────────────────────────
  describe("TC-AG-05 ｜ 編輯 isA 景點 modal 底部有「← 轉回一般景點」，無「轉為替代方案 →」", () => {
    /**
     * Given  D4 已選取，有 isA 景點「Osteria Nuvoli 午餐」
     * When   點擊「編輯景點 Osteria Nuvoli 午餐」
     * Then   modal 底部顯示「← 轉回一般景點」；不顯示「轉為替代方案 →」
     */
    it("should show convert-to-spot button and hide convert-to-alt button for isA spot", async () => {
      const user = await selectD4();

      await user.click(screen.getByRole("button", { name: "編輯景點 Osteria Nuvoli 午餐" }));

      expect(screen.getByRole("button", { name: "← 轉回一般景點" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "轉為替代方案 →" })).not.toBeInTheDocument();
    });
  });

  // ── TC-AG-06 ─────────────────────────────────────────────────────
  describe("TC-AG-06 ｜ 點擊「← 轉回一般景點」景點轉回一般卡片", () => {
    /**
     * Given  編輯景點「Osteria Nuvoli 午餐」modal 已開啟（isA spot）
     * When   點擊「← 轉回一般景點」
     * Then   modal 關閉；景點卡片不再顯示「替代方案」badge；保留景點名稱
     */
    it("should convert isA spot back to regular card and remove alternatives badge", async () => {
      const user = await selectD4();

      await user.click(screen.getByRole("button", { name: "編輯景點 Osteria Nuvoli 午餐" }));
      await user.click(screen.getByRole("button", { name: "← 轉回一般景點" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      // "替代方案" badge on this card should be gone (D4 had only one isA spot)
      expect(screen.queryByText("替代方案")).not.toBeInTheDocument();
      expect(screen.getByText("Osteria Nuvoli 午餐")).toBeInTheDocument();
    });
  });
});
