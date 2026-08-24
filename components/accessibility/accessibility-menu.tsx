"use client";

import { useEffect, useRef, useState } from "react";
import {
  FiActivity,
  FiDroplet,
  FiEye,
  FiEyeOff,
  FiHeart,
  FiLink,
  FiMousePointer,
  FiTarget,
  FiX,
  FiZapOff,
} from "react-icons/fi";
import { MdAccessibilityNew } from "react-icons/md";

const STORAGE_KEY = "equinemates-accessibility-v1";

type AccessibilityPreferences = {
  fontSize: "normal" | "large";
  motor: boolean;
  colorBlind: boolean;
  vision: boolean;
  cognitive: boolean;
  epilepticSafe: boolean;
  adhdFriendly: boolean;
  contrast: 0 | 1 | 2;
  saturation: 0 | 1 | 2;
  highlightLinks: boolean;
};

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  fontSize: "normal",
  motor: false,
  colorBlind: false,
  vision: false,
  cognitive: false,
  epilepticSafe: false,
  adhdFriendly: false,
  contrast: 0,
  saturation: 0,
  highlightLinks: false,
};

const NEED_OPTIONS = [
  {
    key: "motor",
    label: "Motor Impairment",
    description: "Larger controls and stronger focus indicators",
    Icon: FiMousePointer,
  },
  {
    key: "colorBlind",
    label: "Color Blindness",
    description: "Patterns and stronger non-color cues",
    Icon: FiDroplet,
  },
  {
    key: "vision",
    label: "Vision Impairment",
    description: "Larger text and stronger contrast",
    Icon: FiEyeOff,
  },
  {
    key: "cognitive",
    label: "Cognitive Focus",
    description: "Simplified motion and reduced distractions",
    Icon: FiActivity,
  },
  {
    key: "epilepticSafe",
    label: "Epileptic Safe",
    description: "Stops animation and flashing effects",
    Icon: FiZapOff,
  },
  {
    key: "adhdFriendly",
    label: "ADHD Friendly",
    description: "Keeps hovered and focused content prominent",
    Icon: FiTarget,
  },
] as const;

function applyPreferences(preferences: AccessibilityPreferences) {
  const root = document.documentElement;

  root.dataset.a11yFont = preferences.fontSize;
  root.dataset.a11yMotor = String(preferences.motor);
  root.dataset.a11yColorBlind = String(preferences.colorBlind);
  root.dataset.a11yVision = String(preferences.vision);
  root.dataset.a11yCognitive = String(preferences.cognitive);
  root.dataset.a11yEpileptic = String(preferences.epilepticSafe);
  root.dataset.a11yAdhd = String(preferences.adhdFriendly);
  root.dataset.a11yContrast = String(preferences.contrast);
  root.dataset.a11ySaturation = String(preferences.saturation);
  root.dataset.a11yLinks = String(preferences.highlightLinks);
}

function readStoredPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored
      ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
      : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] =
    useState<AccessibilityPreferences>(() => readStoredPreferences());
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

        if (!focusableElements?.length) {
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerElement?.focus();
    };
  }, [isOpen]);

  const savePreferences = (next: AccessibilityPreferences) => {
    setPreferences(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const togglePreference = (
    key: Exclude<
      keyof AccessibilityPreferences,
      "fontSize" | "contrast" | "saturation"
    >,
  ) => {
    savePreferences({ ...preferences, [key]: !preferences[key] });
  };

  const resetPreferences = () => {
    savePreferences(DEFAULT_PREFERENCES);
  };

  return (
    <>
      <button
        aria-controls="accessibility-menu-dialog"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Open accessibility menu"
        className="footer-accessibility-trigger"
        onClick={() => setIsOpen(true)}
        ref={triggerRef}
        title="Accessibility options"
        type="button"
      >
        <span className="footer-accessibility-icon" aria-hidden="true">
          <MdAccessibilityNew />
        </span>
        <span className="sr-only">Accessibility</span>
      </button>

      {isOpen ? (
        <div className="accessibility-menu-layer">
          <button
            aria-label="Close accessibility menu"
            className="accessibility-menu-backdrop"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <section
            aria-labelledby="accessibility-menu-title"
            aria-modal="true"
            className="accessibility-menu-panel"
            id="accessibility-menu-dialog"
            ref={panelRef}
            role="dialog"
          >
            <header className="accessibility-menu-header">
              <h2 id="accessibility-menu-title">Accessibility Menu</h2>
              <button
                aria-label="Close accessibility menu"
                className="accessibility-menu-close"
                onClick={() => setIsOpen(false)}
                ref={closeButtonRef}
                type="button"
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className="accessibility-menu-scroll">
              <fieldset className="accessibility-section">
                <legend>Widget Size</legend>
                <div className="accessibility-segmented">
                  {(["normal", "large"] as const).map((size) => (
                    <button
                      aria-pressed={preferences.fontSize === size}
                      key={size}
                      onClick={() =>
                        savePreferences({ ...preferences, fontSize: size })
                      }
                      type="button"
                    >
                      {size === "normal" ? "Normal" : "Large"}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="accessibility-section">
                <legend>Choose Your Access Needs</legend>
                <div className="accessibility-needs-grid">
                  {NEED_OPTIONS.map(({ key, label, description, Icon }) => (
                    <button
                      aria-describedby={`accessibility-${key}-description`}
                      aria-pressed={preferences[key]}
                      className="accessibility-need-card"
                      key={key}
                      onClick={() => togglePreference(key)}
                      type="button"
                    >
                      <Icon aria-hidden="true" />
                      <strong>{label}</strong>
                      <span
                        className="sr-only"
                        id={`accessibility-${key}-description`}
                      >
                        {description}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="accessibility-section">
                <legend>Visual Settings</legend>
                <div className="accessibility-visual-grid">
                  <button
                    aria-pressed={preferences.contrast > 0}
                    onClick={() =>
                      savePreferences({
                        ...preferences,
                        contrast: ((preferences.contrast + 1) % 3) as 0 | 1 | 2,
                      })
                    }
                    type="button"
                  >
                    <FiEye aria-hidden="true" />
                    <span>Contrast</span>
                    <small>
                      {["Normal", "High", "Maximum"][preferences.contrast]}
                    </small>
                  </button>
                  <button
                    aria-pressed={preferences.saturation > 0}
                    onClick={() =>
                      savePreferences({
                        ...preferences,
                        saturation: ((preferences.saturation + 1) % 3) as
                          | 0
                          | 1
                          | 2,
                      })
                    }
                    type="button"
                  >
                    <FiDroplet aria-hidden="true" />
                    <span>Saturation</span>
                    <small>
                      {["Normal", "Low", "Monochrome"][preferences.saturation]}
                    </small>
                  </button>
                  <button
                    aria-pressed={preferences.highlightLinks}
                    onClick={() => togglePreference("highlightLinks")}
                    type="button"
                  >
                    <FiLink aria-hidden="true" />
                    <span>Highlight Links</span>
                    <small>
                      {preferences.highlightLinks ? "On" : "Off"}
                    </small>
                  </button>
                </div>
              </fieldset>

              <div className="accessibility-menu-note">
                <FiHeart aria-hidden="true" />
                <p>
                  Your choices are saved on this device and can be reset at any
                  time.
                </p>
              </div>
            </div>

            <footer className="accessibility-menu-footer">
              <button onClick={resetPreferences} type="button">
                Reset to Default
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
