"use client";

import { Toaster } from "sonner";

import { useTheme } from "@/components/providers/theme-provider";

export function ThemeToaster() {
  const { theme } = useTheme();

  return <Toaster position="bottom-right" richColors theme={theme} />;
}
