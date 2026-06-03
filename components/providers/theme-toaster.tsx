"use client";

import { Toaster } from "sonner";

import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      offset={{ right: 24, top: 24 }}
      mobileOffset={{ right: 16, top: 16 }}
      position="top-right"
      richColors
      theme={theme}
    />
  );
}
