"use client";

import { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";

import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const label = mounted
    ? isDark
      ? "Switch to light mode"
      : "Switch to dark mode"
    : "Toggle color mode";

  return (
    <button
      aria-label={label}
      aria-pressed={mounted ? isDark : undefined}
      className="icon-link theme-toggle"
      onClick={toggleTheme}
      title={mounted ? (isDark ? "Light mode" : "Dark mode") : "Color mode"}
      type="button"
    >
      {mounted && isDark ? (
        <FiSun height={17} width={17} />
      ) : (
        <FiMoon height={17} width={17} />
      )}
    </button>
  );
}
