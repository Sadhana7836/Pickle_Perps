"use client";

import { useEffect } from "react";
import { useTheme } from "@/lib/store";
import { getTheme } from "@/lib/themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useTheme();

  useEffect(() => {
    const theme = getTheme(themeId);
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.vars)) {
      root.style.setProperty(key, value);
    }
  }, [themeId]);

  return <>{children}</>;
}
