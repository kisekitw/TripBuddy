/**
 * SB: Supabase Auth + Cloud Persistence
 * BDD Integration Tests — TDD Red → Green
 */
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

// ── Mocks ────────────────────────────────────────────────────────

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOAuth: vi.fn().mockResolvedValue({}),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("../lib/db", () => ({
  fetchTrips: vi.fn().mockResolvedValue([]),
  upsertTrip: vi.fn().mockResolvedValue(undefined),
  deleteTrip: vi.fn().mockResolvedValue(undefined),
}));

// Import mocked modules AFTER vi.mock declarations
import { supabase } from "../lib/supabase";
import { fetchTrips } from "../lib/db";

// ── Helpers ──────────────────────────────────────────────────────

const mockSession = {
  access_token: "token-abc",
  user: {
    id: "uuid-user-001",
    email: "tester@example.com",
    user_metadata: { full_name: "Test User" },
  },
};

function noSession() {
  (supabase.auth.getSession as Mock).mockResolvedValue({ data: { session: null } });
}

function withSession() {
  (supabase.auth.getSession as Mock).mockResolvedValue({ data: { session: mockSession } });
}

// ── Setup / Teardown ─────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  // Default: onAuthStateChange never fires (no event)
  (supabase.auth.onAuthStateChange as Mock).mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});

afterEach(() => cleanup());

// ── Tests ────────────────────────────────────────────────────────

describe("SB: Supabase Auth + Cloud Persistence", () => {

  // ── TC-SB-01 ──────────────────────────────────────────────────
  describe("TC-SB-01 ｜ App 啟動時，auth 驗證中顯示 loading", () => {
    /**
     * Given  getSession 尚未 resolve（網路延遲）
     * When   render App
     * Then   顯示「驗證中…」loading 狀態
     */
    it("should show auth loading state while getSession is pending", () => {
      (supabase.auth.getSession as Mock).mockReturnValue(new Promise(() => {})); // never resolves
      render(<App />);
      expect(screen.getByTestId("auth-loading")).toBeInTheDocument();
    });
  });

  // ── TC-SB-02 ──────────────────────────────────────────────────
  describe("TC-SB-02 ｜ 點擊 Google 登入觸發 signInWithOAuth", () => {
    /**
     * Given  無已登入的 session
     * When   用戶點擊「使用 Google 帳號登入」
     * Then   supabase.auth.signInWithOAuth 以 provider: "google" 被呼叫
     */
    it("should call signInWithOAuth with google provider", async () => {
      noSession();
      const user = userEvent.setup();
      render(<App />);
      await waitFor(() =>
        expect(screen.queryByTestId("auth-loading")).not.toBeInTheDocument()
      );
      await user.click(screen.getByText("使用 Google 帳號登入"));
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "google" })
      );
    });
  });

  // ── TC-SB-03 ──────────────────────────────────────────────────
  describe("TC-SB-03 ｜ session 存在時，trips 從 Supabase 載入", () => {
    /**
     * Given  getSession 回傳有效 session
     *        fetchTrips 回傳「雲端旅程」
     *        localStorage 有不同的「本機旅程」
     * When   render App
     * Then   顯示「雲端旅程」，不顯示「本機旅程」
     */
    it("should load trips from Supabase, ignoring localStorage", async () => {
      // Set localStorage to different data
      localStorage.setItem("tb_trips", JSON.stringify([
        { id: 99, title: "本機旅程", dates: "", img: "🏠" },
      ]));
      // Supabase returns different cloud trip
      (fetchTrips as Mock).mockResolvedValue([
        { trip: { id: 1, title: "雲端旅程", dates: "2026-04", img: "☁️" }, days: [] },
      ]);
      withSession();
      render(<App />);
      await waitFor(() =>
        expect(screen.getByText("雲端旅程")).toBeInTheDocument()
      );
      expect(screen.queryByText("本機旅程")).not.toBeInTheDocument();
    });
  });

  // ── TC-SB-04 ──────────────────────────────────────────────────
  describe("TC-SB-04 ｜ Guest 模式仍使用 localStorage", () => {
    /**
     * Given  localStorage 有「本機旅程」
     *        getSession 回傳 null（未登入）
     * When   用戶點擊「先逛逛，稍後再登入」
     * Then   顯示「本機旅程」（來自 localStorage）
     */
    it("should show localStorage trips in guest mode", async () => {
      localStorage.setItem("tb_trips", JSON.stringify([
        { id: 5, title: "本機旅程", dates: "", img: "🏠" },
      ]));
      localStorage.setItem("tb_tripDaysMap", JSON.stringify({ 5: [] }));
      noSession();
      const user = userEvent.setup();
      render(<App />);
      await waitFor(() =>
        expect(screen.queryByTestId("auth-loading")).not.toBeInTheDocument()
      );
      await user.click(screen.getByText("先逛逛，稍後再登入"));
      expect(screen.getByText("本機旅程")).toBeInTheDocument();
    });
  });

  // ── TC-SB-05 ──────────────────────────────────────────────────
  describe("TC-SB-05 ｜ 登出後清空 trips state，返回登入頁", () => {
    /**
     * Given  有效 session，雲端有旅程
     * When   用戶點擊「登出」
     * Then   supabase.auth.signOut 被呼叫；返回登入頁（顯示「使用 Google 帳號登入」）
     */
    it("should call signOut and navigate to login on logout", async () => {
      (fetchTrips as Mock).mockResolvedValue([
        { trip: { id: 1, title: "雲端旅程", dates: "", img: "✈️" }, days: [] },
      ]);
      withSession();
      const user = userEvent.setup();
      render(<App />);
      await waitFor(() => screen.getByText("雲端旅程"));
      await user.click(screen.getByText("登出"));
      expect(supabase.auth.signOut).toHaveBeenCalled();
      await waitFor(() =>
        expect(screen.getByText("使用 Google 帳號登入")).toBeInTheDocument()
      );
    });
  });

  // ── TC-SB-06 ──────────────────────────────────────────────────
  describe("TC-SB-06 ｜ 首次登入且本機有行程，顯示遷移詢問 modal", () => {
    /**
     * Given  localStorage 有「本機旅程」
     *        getSession 回傳有效 session
     *        fetchTrips 回傳空陣列（雲端無資料）
     * When   render App
     * Then   出現「匯入本機行程？」modal
     */
    it("should show migration modal when local data exists but cloud is empty", async () => {
      localStorage.setItem("tb_trips", JSON.stringify([
        { id: 99, title: "本機旅程", dates: "", img: "🏠" },
      ]));
      (fetchTrips as Mock).mockResolvedValue([]); // cloud is empty
      withSession();
      render(<App />);
      await waitFor(() =>
        expect(screen.getByText("匯入本機行程？")).toBeInTheDocument()
      );
    });
  });
});
