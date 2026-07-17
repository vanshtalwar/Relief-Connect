"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { dictionaries, Language, Dictionary } from "@/lib/i18n/dictionaries";

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Dictionary;
};

const I18nContext = createContext<I18nContextType | null>(null);

declare global {
  interface Window {
    googleTranslateElementInit: () => void;
    google: any;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check google translate cookie to sync state
    const match = document.cookie.match(/(?:^|;)\s*googtrans=([^;]*)/);
    const googtrans = match ? decodeURIComponent(match[1]) : null;
    
    if (googtrans === "/en/hi") {
      setLanguageState("hi");
    } else {
      setLanguageState("en");
    }

    // Inject Google Translate Script
    if (!document.getElementById("google-translate-script")) {
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          { pageLanguage: "en", autoDisplay: false },
          "google_translate_element"
        );
      };

      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    
    if (lang === "hi") {
      document.cookie = "googtrans=/en/hi; path=/";
      document.cookie = "googtrans=/en/hi; path=/; domain=" + location.hostname;
    } else {
      // Clear or set to English
      document.cookie = "googtrans=/en/en; path=/";
      document.cookie = "googtrans=/en/en; path=/; domain=" + location.hostname;
    }
    
    // Reload to apply Google Translate DOM changes globally
    window.location.reload();
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

  return (
    <I18nContext.Provider value={value}>
      <div id="google_translate_element" className="hidden" />
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
