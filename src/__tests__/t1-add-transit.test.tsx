/**
 * T-1: 新增交通行程
 * BDD Integration Tests — TDD Red → Green
 *
 * 前置條件：進入 SAMPLE_TRIP Editor，選擇 D1（台北 → 杜拜）
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

async function selectD1() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D1"));
  return user;
}

describe("T-1: 新增交通行程", () => {

  // ── TC-T1-01 ─────────────────────────────────────────────────────
  describe("TC-T1-01 ｜ 點擊「+ 交通」出現新增交通 modal", () => {
    /**
     * Given  D1 已選取
     * When   點擊「+ 交通」按鈕
     * Then   modal 出現，含「交通名稱」輸入框
     */
    it("should open transit modal with name input", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "+ 交通" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("交通名稱")).toBeInTheDocument();
    });
  });

  // ── TC-T1-02 ─────────────────────────────────────────────────────
  describe("TC-T1-02 ｜ 填入交通名稱後成功新增，顯示交通圖示", () => {
    /**
     * Given  交通 modal 已開啟
     * When   輸入「搭機 TPE → DXB」並點「新增」
     * Then   modal 關閉，景點清單出現「搭機 TPE → DXB」，
     *        且該條目帶有 data-testid="transit-item" 標記
     */
    it("should add transit item with transit-item testid", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "+ 交通" }));
      await user.type(screen.getByLabelText("交通名稱"), "搭機 TPE → DXB");
      await user.click(screen.getByRole("button", { name: "新增" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("搭機 TPE → DXB")).toBeInTheDocument();
      expect(screen.getByTestId("transit-item")).toBeInTheDocument();
    });
  });

  // ── TC-T1-03 ─────────────────────────────────────────────────────
  describe("TC-T1-03 ｜ 未填名稱直接送出顯示驗證錯誤", () => {
    /**
     * Given  交通 modal 已開啟
     * When   不輸入名稱直接點「新增」
     * Then   modal 不關閉，顯示「請輸入交通名稱」
     */
    it("should show validation error for empty transit name", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "+ 交通" }));
      await user.click(screen.getByRole("button", { name: "新增" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("請輸入交通名稱")).toBeInTheDocument();
    });
  });

  // ── TC-T1-04 ─────────────────────────────────────────────────────
  describe("TC-T1-04 ｜ 取消不新增交通", () => {
    /**
     * Given  交通 modal 已開啟，輸入名稱
     * When   點「取消」
     * Then   modal 關閉，清單無變化
     */
    it("should close modal without adding transit when cancelled", async () => {
      const user = await selectD1();
      const initialTransitCount = screen.queryAllByTestId("transit-item").length;

      await user.click(screen.getByRole("button", { name: "+ 交通" }));
      await user.type(screen.getByLabelText("交通名稱"), "搭機");
      await user.click(screen.getByRole("button", { name: "取消" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryAllByTestId("transit-item").length).toBe(initialTransitCount);
    });
  });

  // ── TC-T1-05 ─────────────────────────────────────────────────────
  describe("TC-T1-05 ｜ 刪除交通條目", () => {
    /**
     * Given  已新增一筆交通「搭機 TPE → DXB」
     * When   點擊其刪除按鈕
     * Then   條目從清單消失
     */
    it("should remove transit item when delete button is clicked", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "+ 交通" }));
      await user.type(screen.getByLabelText("交通名稱"), "搭機 TPE → DXB");
      await user.click(screen.getByRole("button", { name: "新增" }));

      expect(screen.getByText("搭機 TPE → DXB")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "刪除景點 搭機 TPE → DXB" }));

      expect(screen.queryByText("搭機 TPE → DXB")).not.toBeInTheDocument();
    });
  });
});
