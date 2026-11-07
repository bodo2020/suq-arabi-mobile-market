import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const ORDER = ["light", "dark", "system"] as const;
type Theme = typeof ORDER[number];
const LABELS: Record<Theme, string> = { light: "فاتح", dark: "غامق", system: "حسب الموبايل" };
const ICONS = { light: Sun, dark: Moon, system: Monitor };

/** Account row: tap to cycle فاتح → غامق → حسب الموبايل. */
export function ThemeRow() {
  const { theme, setTheme } = useTheme();
  const current: Theme = (ORDER as readonly string[]).includes(theme || "") ? theme as Theme : "light";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICONS[current];
  return (
    <button type="button" onClick={() => setTheme(next)} className="acc-row w-full text-right"
      aria-label={`المظهر: ${LABELS[current]}. اضغط للتحويل إلى ${LABELS[next]}`}>
      <span className="acc-row__icon"><Icon size={19} /></span>
      <span className="acc-row__text"><strong>المظهر</strong><small>فاتح أو غامق أو حسب إعداد الموبايل</small></span>
      <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{LABELS[current]}</span>
    </button>
  );
}
