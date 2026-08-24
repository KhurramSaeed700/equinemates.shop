"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiGlobe, FiMoon, FiSettings, FiSun } from "react-icons/fi";

import { useCurrency } from "@/components/providers/currency-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { useTheme } from "@/components/providers/theme-provider";

export function SiteSettings() {
  const [open, setOpen] = useState(false);
  const { currency, setCurrency, supportedCurrencies } = useCurrency();
  const { language, languages, setLanguage, t } = useLanguage();
  const { setTheme, theme } = useTheme();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="site-settings" ref={rootRef}>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("settings")}
        className={
          open
            ? "icon-link site-settings-trigger site-settings-trigger-active"
            : "icon-link site-settings-trigger"
        }
        onClick={() => setOpen((current) => !current)}
        title={t("settings")}
        type="button"
      >
        <FiSettings aria-hidden="true" />
      </button>

      {open ? (
        <div
          aria-label={t("settings")}
          className="site-settings-panel"
          id={panelId}
          role="dialog"
        >
          <div className="site-settings-heading">
            <FiSettings aria-hidden="true" />
            <strong>{t("settings")}</strong>
          </div>

          <section className="site-settings-section">
            <span className="site-settings-label">{t("currency")}</span>
            <div className="site-settings-segments">
              {supportedCurrencies.map((code) => (
                <button
                  aria-pressed={currency === code}
                  className={currency === code ? "is-active" : undefined}
                  key={code}
                  onClick={() => setCurrency(code)}
                  type="button"
                >
                  {code}
                </button>
              ))}
            </div>
          </section>

          <section className="site-settings-section">
            <span className="site-settings-label">{t("appearance")}</span>
            <div className="site-settings-segments site-settings-theme-options">
              <button
                aria-pressed={theme === "light"}
                className={theme === "light" ? "is-active" : undefined}
                onClick={() => setTheme("light")}
                type="button"
              >
                <FiSun aria-hidden="true" />
                {t("lightMode")}
              </button>
              <button
                aria-pressed={theme === "dark"}
                className={theme === "dark" ? "is-active" : undefined}
                onClick={() => setTheme("dark")}
                type="button"
              >
                <FiMoon aria-hidden="true" />
                {t("darkMode")}
              </button>
            </div>
          </section>

          <section className="site-settings-section">
            <span className="site-settings-label">
              <FiGlobe aria-hidden="true" />
              {t("language")}
            </span>
            <select
              aria-label={t("language")}
              className="site-settings-language-select"
              onChange={(event) =>
                setLanguage(event.currentTarget.value as typeof language)
              }
              value={language}
            >
              {languages.map((option) => (
                <option key={option.code} lang={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </section>
        </div>
      ) : null}
    </div>
  );
}
