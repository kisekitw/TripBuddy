
import type { Locale, Translations } from "../i18n";

import { colors as C } from "../utils/colors";
import { LangSwitcher } from "../components/LangSwitcher";
import { GoogleIcon } from "../components/GoogleIcon";

interface Props {
  t: Translations;
  lang: Locale;
  setLang: (l: Locale) => void;
  onLogin: () => void;
  onGuest: () => void;
  authLoading?: boolean;
}

export function LoginPage({ t, lang, setLang, onLogin, onGuest, authLoading }: Props) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "absolute", top: 20, right: 24 }}>
        <LangSwitcher lang={lang} setLang={setLang} />
      </div>
      <div style={{ width: 400, maxWidth: "90vw", textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia,serif", fontSize: 36, fontWeight: 700, color: C.ink, margin: "0 0 6px" }}>
          TripBuddy
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 40px" }}>{t.tagline}</p>
        <div style={{ background: C.card, borderRadius: 20, padding: 32, border: `1px solid ${C.light}`, textAlign: "left" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.ink, margin: "0 0 6px" }}>{t.loginTitle}</h3>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", lineHeight: 1.6 }}>{t.loginDesc}</p>
          {authLoading && (
            <div style={{ textAlign: "center", padding: "4px 0 12px", color: C.muted, fontSize: 12 }} data-testid="auth-loading">
              驗證中…
            </div>
          )}
          <button
            onClick={onLogin}
            disabled={authLoading}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 0", borderRadius: 100, border: `1px solid ${C.light}`, background: C.card, fontSize: 14, fontWeight: 500, color: C.ink, cursor: authLoading ? "default" : "pointer", marginBottom: 12, opacity: authLoading ? 0.5 : 1 }}
          >
            <GoogleIcon /> {t.googleLogin}
          </button>
          <button
            onClick={onGuest}
            style={{ width: "100%", padding: "12px 0", borderRadius: 100, border: "none", background: "transparent", fontSize: 13, color: C.muted, cursor: "pointer" }}
          >
            {t.guestLogin}
          </button>
          <p style={{ fontSize: 11, color: C.muted, textAlign: "center", margin: "12px 0 0", opacity: 0.6 }}>{t.loginNote}</p>
        </div>
      </div>
    </div>
  );
}
