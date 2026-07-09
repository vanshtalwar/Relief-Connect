"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { dictionaries, Language, Dictionary } from "@/lib/i18n/dictionaries";

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Dictionary;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("i18n-lang") as Language;
    if (stored && (stored === "en" || stored === "hi")) {
      setLanguageState(stored);
    } else {
      const browserLang = navigator.language.split("-")[0];
      if (browserLang === "hi") {
        setLanguageState("hi");
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("i18n-lang", lang);
  };

  const value = {
    language,
    setLanguage,
    t: dictionaries[language],
  };

  if (!mounted) {
    return (
      <div className="invisible">
        <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
      </div>
    );
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
