/**
 * CX: 跨夜交通出發/抵達時間連動（Cross-midnight cascade）
 * BDD Integration Tests — TDD Red → Green
 *
 * 問題：auto 模式下，修改前一景點時長後，跨夜出發卡的 t 與 nextDayArrival
 *       沒有連動更新。抵達卡（D2）的 t 也應該跟著同步。
 *
 * 前置設定：D1 有「桃園機場出發」(t=1400, d=20, tr=10)
 *   → 正常銜接：出發時間 1400+20+10=1430 (23:50)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { recalcDay } from "../utils";
import type { Day } from "../types";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

// ── Unit test helpers ─────────────────────────────────────────────

/** Day with a spot followed by a cross-midnight transit */
function makeTestDay(): Day {
  return {
    id: 99, n: 99, dt: "test", st: "c", lb: "test",
    sp: [
      { id: "s1", nm: "前置景點", t: 540, d: 60, tr: 10, la: 0, ln: 0 },
      // s1 ends at 540+60+10=610; transit starts at 610
      { id: "t1", nm: "夜班機", t: 610, d: 870, tr: 0, la: 0, ln: 0,
        // 610+870=1480 ≥ 1440 → nextDayArrival=40 (00:40)
        type: "transit" as const, nextDayArrival: 40, linkedSpotId: "arr1", tzOffset: 0 },
    ],
  };
}

// ── App UI helpers ────────────────────────────────────────────────

async function selectD1() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D1"));
  return user;
}

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

// ─────────────────────────────────────────────────────────────────

describe("CX: 跨夜交通出發/抵達時間連動", () => {

  // ── TC-CX-01 (unit) ──────────────────────────────────────────────
  describe("TC-CX-01 ｜ recalcDay 連動跨夜出發時間", () => {
    /**
     * Given  Day: [前置景點(t=540,d=60,tr=10), 夜班機(t=610,d=870)]
     * When   前置景點時長從 60 改為 120（ends at 540+120+10=670）
     * Then   recalcDay 後 transit.t = 670
     */
    it("should cascade transit departure time in recalcDay", () => {
      const day = makeTestDay();
      const modified: Day = {
        ...day,
        sp: [{ ...day.sp![0], d: 120 }, day.sp![1]],
      };
      const result = recalcDay(modified);
      const transit = result.sp![1];
      expect(transit.t).toBe(670); // 540+120+10=670
    });
  });

  // ── TC-CX-02 (unit) ──────────────────────────────────────────────
  describe("TC-CX-02 ｜ recalcDay 連動 nextDayArrival", () => {
    /**
     * Given  同 TC-CX-01
     * When   前置景點 d 改為 120
     * Then   nextDayArrival = 670+870-1440 = 100 (01:40)
     */
    it("should update nextDayArrival when departure cascades", () => {
      const day = makeTestDay();
      const modified: Day = {
        ...day,
        sp: [{ ...day.sp![0], d: 120 }, day.sp![1]],
      };
      const result = recalcDay(modified);
      const transit = result.sp![1];
      expect(transit.nextDayArrival).toBe(100); // 670+870-1440=100
    });
  });

  // ── TC-CX-03 (integration) ───────────────────────────────────────
  describe("TC-CX-03 ｜ UI：修改時長後 depCard 顯示新出發時間", () => {
    /**
     * Given  D1: 桃園機場出發(t=1400,d=20,tr=10) + 新增 EK068 at 23:50（→隔天 04:35）
     * When   將桃園機場出發時長從 20min 改為 5min
     * Then   出發卡顯示 "23:35"（1400+5+10=1415=23:35）
     */
    it("should update departure card time after spot duration change", async () => {
      const user = await selectD1();
      await fillTransitForm(user, "EK068 測試", "23:50", 4, 45);

      // Initial: depCard shows 23:50
      const depCard = screen.getByTestId("transit-departure");
      expect(depCard).toHaveTextContent("23:50");

      // Change duration: 0h 20m → 0h 5m
      await user.click(screen.getByRole("button", { name: "停留時長 桃園機場出發" }));
      const mInput = screen.getByLabelText("停留時長 桃園機場出發 分鐘");
      await user.clear(mInput);
      await user.type(mInput, "5");
      await user.keyboard("{Enter}");

      // After cascade: 1400+5+10=1415 → 23:35
      expect(depCard).toHaveTextContent("23:35");
    });
  });

  // ── TC-CX-04 (integration) ───────────────────────────────────────
  describe("TC-CX-04 ｜ UI：D2 抵達卡 t 也同步更新", () => {
    /**
     * Given  同 TC-CX-03，修改後 nextDayArrival 應為 1415+285-1440=260 (04:20)
     * When   切換到 D2
     * Then   抵達卡顯示 "04:20"（而非舊的 "04:35"）
     */
    it("should sync arrival card on D2 after departure cascade", async () => {
      const user = await selectD1();
      await fillTransitForm(user, "EK068 測試", "23:50", 4, 45);

      // Change duration 20m → 5m
      await user.click(screen.getByRole("button", { name: "停留時長 桃園機場出發" }));
      const mInput = screen.getByLabelText("停留時長 桃園機場出發 分鐘");
      await user.clear(mInput);
      await user.type(mInput, "5");
      await user.keyboard("{Enter}");

      // Switch to D2
      await user.click(screen.getByText("D2"));

      const arrCard = screen.getByTestId("transit-arrival");
      expect(arrCard).toHaveTextContent("04:20"); // 1415+285-1440=260=04:20
    });
    afterEach(() => cleanup());
  });
});
