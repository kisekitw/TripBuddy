/**
 * T-2: 跨夜交通（Cross-Midnight Transit）— linked 雙卡片
 * BDD Integration Tests — TDD Red → Green
 *
 * 使用情境：用戶新增跨夜航班，出發卡出現在 Day 1，抵達卡自動插入 Day 2 開頭。
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

/** 以 Guest 登入 → SAMPLE_TRIP → 選擇 D1 */
async function selectD1() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D1"));
  return user;
}

/** 開啟新增交通 modal 並填入時間/時長 */
async function fillTransitForm(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  time: string,
  hours: number,
  mins: number,
) {
  await user.click(screen.getByRole("button", { name: "+ 交通" }));
  await user.type(screen.getByLabelText("交通名稱"), name);

  const timeInput = screen.getByLabelText("開始時間");
  await user.clear(timeInput);
  await user.type(timeInput, time);

  const hoursInput = screen.getByLabelText("小時");
  await user.clear(hoursInput);
  await user.type(hoursInput, String(hours));

  const minsInput = screen.getByLabelText("分鐘");
  await user.clear(minsInput);
  await user.type(minsInput, String(mins));

  await user.click(screen.getByRole("button", { name: "新增" }));
}

describe("T-2: 跨夜交通 linked 雙卡片", () => {

  // ── TC-T2-01 ─────────────────────────────────────────────────────
  describe("TC-T2-01 ｜ 同天內交通不分割", () => {
    /**
     * Given  D1 已選取
     * When   新增交通「捷運 MRT」21:00 + 2h（抵達 23:00，< 24:00）
     * Then   只有一張 transit-item 卡片，無 transit-departure testid
     */
    it("should create one regular transit card (no split) for same-day transit", async () => {
      const user = await selectD1();
      await fillTransitForm(user, "捷運 MRT", "21:00", 2, 0);

      // 同天交通 → 只出現 transit-item，不出現 transit-departure
      expect(screen.getByTestId("transit-item")).toBeInTheDocument();
      expect(screen.queryByTestId("transit-departure")).not.toBeInTheDocument();
      expect(screen.queryByTestId("transit-arrival")).not.toBeInTheDocument();
    });
  });

  // ── TC-T2-02 ─────────────────────────────────────────────────────
  describe("TC-T2-02 ｜ 跨夜交通 Day 1 顯示出發卡", () => {
    /**
     * Given  D1 已選取
     * When   新增交通「阿聯酋航空 EK068」23:50 + 4h45m（抵達隔天 04:35）
     * Then   Day 1 出現 transit-departure 卡片，包含「23:50」和「04:35」文字，及 +1天 badge
     */
    it("should show departure card with cross-midnight time display", async () => {
      const user = await selectD1();
      await fillTransitForm(user, "阿聯酋航空 EK068", "23:50", 4, 45);

      const depCard = screen.getByTestId("transit-departure");
      expect(depCard).toBeInTheDocument();
      expect(depCard).toHaveTextContent("23:50");
      expect(depCard).toHaveTextContent("04:35");
      expect(depCard).toHaveTextContent("+1天");
    });
  });

  // ── TC-T2-03 ─────────────────────────────────────────────────────
  describe("TC-T2-03 ｜ 跨夜交通自動在 Day 2 插入抵達卡", () => {
    /**
     * Given  D1 已選取
     * When   新增跨夜交通後切換到 Day 2
     * Then   Day 2 第一個項目是 transit-arrival 卡片，顯示 04:35
     */
    it("should insert arrival card at start of Day 2 with arrival time", async () => {
      const user = await selectD1();
      await fillTransitForm(user, "阿聯酋航空 EK068", "23:50", 4, 45);

      // 切換到 Day 2
      await user.click(screen.getByText("D2"));

      const arrCard = screen.getByTestId("transit-arrival");
      expect(arrCard).toBeInTheDocument();
      expect(arrCard).toHaveTextContent("04:35");
    });
  });

  // ── TC-T2-04 ─────────────────────────────────────────────────────
  describe("TC-T2-04 ｜ 刪除出發卡出現確認 dialog，確認後兩卡消失", () => {
    /**
     * Given  已新增跨夜交通（出發卡在 Day 1，抵達卡在 Day 2）
     * When   點擊出發卡的刪除按鈕
     * Then   出現確認 dialog（含跨夜刪除提示）
     *        確認後：Day 1 無出發卡，Day 2 無抵達卡
     */
    it("should show confirm dialog and delete both cards on confirm", async () => {
      const user = await selectD1();
      await fillTransitForm(user, "阿聯酋航空 EK068", "23:50", 4, 45);

      // 點擊出發卡刪除按鈕
      const depCard = screen.getByTestId("transit-departure");
      const deleteBtn = depCard.querySelector("button[aria-label*='刪除']") as HTMLElement;
      await user.click(deleteBtn);

      // dialog 出現，含確認訊息
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText("此為跨夜交通，確定要同時刪除出發與抵達卡片？")).toBeInTheDocument();

      // 點確認刪除
      await user.click(screen.getByRole("button", { name: "確認刪除" }));

      // Day 1 出發卡消失
      expect(screen.queryByTestId("transit-departure")).not.toBeInTheDocument();

      // 切換到 Day 2，抵達卡也消失
      await user.click(screen.getByText("D2"));
      expect(screen.queryByTestId("transit-arrival")).not.toBeInTheDocument();
    });
  });

  // ── TC-T2-05 ─────────────────────────────────────────────────────
  describe("TC-T2-05 ｜ Day 2 不存在時自動建立", () => {
    /**
     * Given  建立只有 1 天的全新旅程
     * When   在 Day 1 新增跨夜交通
     * Then   側欄出現 Day 2（D2）
     */
    it("should auto-create Day 2 when adding cross-midnight transit to a 1-day trip", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByText("先逛逛，稍後再登入"));

      // 建立新旅程（只有 1 天）
      await user.click(screen.getByRole("button", { name: "+ 新增行程" }));
      await user.type(screen.getByLabelText("旅程名稱"), "測試單日行程");
      await user.click(screen.getByRole("button", { name: "建立" }));
      await user.click(screen.getByText("測試單日行程"));

      // 選擇 D1
      await user.click(screen.getByText("D1"));

      // 新增跨夜交通（23:50 + 4h45m → 隔天 04:35）
      await fillTransitForm(user, "測試跨夜航班", "23:50", 4, 45);

      // 側欄應出現 D2
      expect(screen.getByText("D2")).toBeInTheDocument();
    });
  });
});
