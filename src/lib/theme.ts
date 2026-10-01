import { useEffect } from "react";
import type { ThemeId } from "../types";

export function applyTheme(themeId: ThemeId | string | undefined) {
  const next = themeId || "none";
  document.documentElement.dataset.theme = next === "none" ? "" : next;
  if (next === "none") document.documentElement.removeAttribute("data-theme");
}

export function useTheme(themeId: ThemeId | string | undefined) {
  useEffect(() => {
    applyTheme(themeId);
    return () => applyTheme("none");
  }, [themeId]);
}
