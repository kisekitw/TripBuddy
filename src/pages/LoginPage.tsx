
import type { Locale, Translations } from "../i18n";

import { colors as C } from "../utils/colors";
import { LangSwitcher } from "../components/LangSwitcher";
import { GoogleIcon } from "../components/GoogleIcon";

const FD = "'Playfair Display', Georgia, serif";

interface Props {
  t: Translations;
  lang: Locale;
  setLang: (l: Locale) => void;
  onLogin: () => void;
  onGuest: () => void;
  authLoading?: boolean;
}

export function LoginPage({ t, lang, setLang, onLogin, onGuest, authLoading }: Props) {
  const isZh = lang === "zh-TW";

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* LEFT — Brand panel */}
      <div style={{
        flex: "0 0 55%",
        background: "linear-gradient(165deg,#4a2810 0%,#8a5030 55%,#c07848 100%)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 56px",
        overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 340, height: 340, borderRadius: "50%", border: "1px solid rgba(255,255,255,.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -30, right: -30, width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(255,255,255,.10)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -100, left: -60, width: 300, height: 300, borderRadius: "50%", border: "1px solid rgba(255,255,255,.06)", pointerEvents: "none" }} />

        <div>
          <div style={{ fontSize: 11, letterSpacing: ".2em", color: "rgba(255,255,255,.5)", textTransform: "uppercase", marginBottom: 16 }}>
            TripBuddy
          </div>
          <h1 style={{ fontFamily: FD, fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1.15, margin: 0, maxWidth: 360, textShadow: "0 2px 20px rgba(0,0,0,.25)", whiteSpace: "pre-line" }}>
            {isZh ? "每一段旅程\n都值得被記錄" : "Every journey\ndeserves to be told"}
          </h1>
          <div style={{ width: 48, height: 2, background: C.accent, margin: "28px 0 24px", borderRadius: 2 }} />
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.72)", fontStyle: "italic", lineHeight: 1.7, maxWidth: 320 }}>
            {isZh ? "打造你的專屬旅行日記，永遠比旅伴更快一步。" : "Build your personal travel journal, always one step ahead."}
          </p>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 20 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.45)", fontStyle: "italic", lineHeight: 1.6 }}>
            "Not all those who wander are lost."<br />
            <span style={{ fontSize: 11, letterSpacing: ".05em", fontStyle: "normal" }}>— J.R.R. Tolkien</span>
          </p>
        </div>
      </div>

      {/* RIGHT — Login form */}
      <div style={{ flex: 1, background: C.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 56px", position: "relative" }}>
        {/* Lang switcher */}
        <div style={{ position: "absolute", top: 32, right: 40 }}>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>

        <div className="fade-up">
          <div style={{ fontSize: 11, letterSpacing: ".15em", color: C.accent, textTransform: "uppercase", marginBottom: 12 }}>
            {isZh ? "歡迎回來" : "Welcome back"}
          </div>
          <h2 style={{ fontFamily: FD, fontSize: 34, fontWeight: 700, color: C.ink, margin: "0 0 8px", lineHeight: 1.2 }}>
            {isZh ? "下一站，從這裡開始。" : "Your next adventure awaits."}
          </h2>
          <p style={{ fontSize: 14, color: C.muted, margin: "0 0 40px", lineHeight: 1.6 }}>
            {t.loginDesc}
          </p>

          {authLoading && (
            <div style={{ textAlign: "center", padding: "4px 0 12px", color: C.muted, fontSize: 12 }} data-testid="auth-loading">
              驗證中…
            </div>
          )}

          <button
            onClick={onLogin}
            disabled={authLoading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              padding: "16px 24px", borderRadius: 8, marginBottom: 12,
              border: `1.5px solid ${C.light}`, background: C.card,
              fontSize: 14, color: C.ink, cursor: authLoading ? "default" : "pointer",
              boxShadow: "0 2px 12px rgba(44,26,14,.07)", opacity: authLoading ? 0.5 : 1,
            }}
          >
            <GoogleIcon /> {t.googleLogin}
          </button>

          <button
            onClick={onGuest}
            style={{
              width: "100%", padding: "14px 0", background: "transparent",
              border: "none", fontSize: 13, color: C.muted, cursor: "pointer", letterSpacing: ".02em",
            }}
          >
            {t.guestLogin} →
          </button>

          <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 28, opacity: 0.6, lineHeight: 1.6 }}>
            {t.loginNote}
          </p>
        </div>
      </div>
    </div>
  );
}
