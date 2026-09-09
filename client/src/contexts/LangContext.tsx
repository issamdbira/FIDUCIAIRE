import React, { createContext, useContext, useEffect, useState } from "react";

type Lang = "fr" | "ar";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  dir: "ltr" | "rtl";
  isAr: boolean;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("lang");
    return (stored as Lang) || "fr";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("lang", lang);
    root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    if (lang === "ar") {
      root.classList.add("rtl");
    } else {
      root.classList.remove("rtl");
    }
  }, [lang]);

  const dir = lang === "ar" ? "rtl" : "ltr";
  const isAr = lang === "ar";

  return (
    <LangContext.Provider value={{ lang, setLang, dir, isAr }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LangContext);
  if (!context) {
    throw new Error("useLang must be used within LangProvider");
  }
  return context;
}
