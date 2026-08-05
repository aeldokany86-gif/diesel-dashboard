"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import { translate } from "../i18n";
import { updateLanguagePreference } from "../services/preferencesService";

const LANGUAGE_STORAGE_KEY = "fleetfuelpro_language";
const DEFAULT_LANGUAGE = "en";
const SUPPORTED_LANGUAGES = ["en", "ar"];

const LanguageContext = createContext(null);

function normalizeLanguage(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SUPPORTED_LANGUAGES.includes(normalized)
    ? normalized
    : DEFAULT_LANGUAGE;
}

function readStoredLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

export function LanguageProvider({ children }) {
  const { currentUser, updateCurrentUser } = useAuth();
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);
  const initializedRef = useRef(false);

  const applyLanguage = useCallback((nextLanguage) => {
    const normalizedLanguage = normalizeLanguage(nextLanguage);

    setLanguageState(normalizedLanguage);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        LANGUAGE_STORAGE_KEY,
        normalizedLanguage,
      );
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = normalizedLanguage;
      document.documentElement.dir =
        normalizedLanguage === "ar" ? "rtl" : "ltr";
      document.documentElement.dataset.language = normalizedLanguage;
    }

    return normalizedLanguage;
  }, []);

  useEffect(() => {
    const storedLanguage = readStoredLanguage();
    applyLanguage(storedLanguage);
    initializedRef.current = true;
  }, [applyLanguage]);

  useEffect(() => {
    if (!initializedRef.current || !currentUser) return;

    const backendLanguage = normalizeLanguage(
      currentUser.preferredLanguage,
    );

    applyLanguage(backendLanguage);
  }, [currentUser?.id, currentUser?.preferredLanguage, applyLanguage]);

  const setLanguage = useCallback(
    async (nextLanguage) => {
      const normalizedLanguage = normalizeLanguage(nextLanguage);
      const previousLanguage = language;

      if (normalizedLanguage === previousLanguage) {
        return normalizedLanguage;
      }

      applyLanguage(normalizedLanguage);

      if (!currentUser) {
        return normalizedLanguage;
      }

      setIsUpdatingLanguage(true);

      try {
        const result = await updateLanguagePreference(normalizedLanguage);
        const savedLanguage = normalizeLanguage(
          result?.preferredLanguage || normalizedLanguage,
        );

        applyLanguage(savedLanguage);
        updateCurrentUser?.({
          preferredLanguage: savedLanguage,
        });

        return savedLanguage;
      } catch (error) {
        applyLanguage(previousLanguage);
        throw error;
      } finally {
        setIsUpdatingLanguage(false);
      }
    }, [
      language,
      currentUser,
      applyLanguage,
      updateCurrentUser,
    ],
  );

  const t = useCallback(
    (key, variables) => translate(language, key, variables),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      direction: language === "ar" ? "rtl" : "ltr",
      isRtl: language === "ar",
      isUpdatingLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES,
      setLanguage,
      t,
    }),
    [language, isUpdatingLanguage, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
