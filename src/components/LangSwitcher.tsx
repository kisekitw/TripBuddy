import React from "react";
import type { Locale } from "../i18n";
import { colors as C } from "../utils/colors";

interface Props {
  lang: Locale;
  setLang: (l: Locale) => void;
  small?: boolean;
}

export function LangSwitcher({ lang, setLang, small }: Props) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: small ? "2px 7px" : "4px 10px",
    borderRadius: 100, fontSize: small ? 10 : 11,
    border: `1px solid ${C.light}`, background: "transparent",
    color: C.muted, cursor: "pointer", whiteSpace: "nowrap",
  };

  return (
    <div style={{ display: "flex", gap: 2 }}>
      <button
        onClick={() => setLang("zh-TW")}
        style={{
          ...base,
          background: lang === "zh-TW" ? C.infoBg : "transparent",
          color: lang === "zh-TW" ? C.infoText : C.muted,
          borderColor: lang === "zh-TW" ? C.infoBorder : C.light,
        }}
      >
        繁中
      </button>
      <button
        onClick={() => setLang("en")}
        style={{
          ...base,
          background: lang === "en" ? C.infoBg : "transparent",
          color: lang === "en" ? C.infoText : C.muted,
          borderColor: lang === "en" ? C.infoBorder : C.light,
        }}
      >
        EN
      </button>
    </div>
  );
}
