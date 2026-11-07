import { useEffect, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";

export const THEME_STORAGE_KEY = "sm-theme";

/** Printed receipts / invoices always use the light theme. */
function PrintAlwaysLight() {
  useEffect(() => {
    const root = document.documentElement;
    let wasDark = false;
    const before = () => { wasDark = root.classList.contains("dark"); root.classList.remove("dark"); };
    const after = () => { if (wasDark) root.classList.add("dark"); };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => { window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); };
  }, []);
  return null;
}

/** Light by default; each customer can pick light, dark or "follow the phone" (saved on the device). */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey={THEME_STORAGE_KEY} disableTransitionOnChange>
      <PrintAlwaysLight />
      {children}
    </ThemeProvider>
  );
}
