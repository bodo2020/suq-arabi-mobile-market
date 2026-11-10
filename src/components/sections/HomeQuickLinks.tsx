import { BadgePercent, Flame, RotateCcw, Sparkles, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type QuickLink = { label: string; icon: LucideIcon; to?: string; anchor?: string };

const LINKS: QuickLink[] = [
  { label: 'اطلب تاني', icon: RotateCcw, to: '/orders' },
  { label: 'العروض', icon: BadgePercent, to: '/offers' },
  { label: 'الأكثر طلبًا', icon: Flame, anchor: 'home-popular' },
  { label: 'وصل جديد', icon: Sparkles, anchor: 'home-new' },
];

/** Four shortcuts under the banners; the last two jump to rails further down the page. */
export default function HomeQuickLinks() {
  const navigate = useNavigate();
  const open = (link: QuickLink) => {
    if (link.anchor) {
      const target = document.getElementById(link.anchor);
      if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      navigate('/offers');
      return;
    }
    if (link.to) navigate(link.to);
  };

  return (
    <nav aria-label="اختصارات" className="grid grid-cols-4 gap-2">
      {LINKS.map(link => {
        const Icon = link.icon;
        return (
          <button
            key={link.label}
            type="button"
            onClick={() => open(link)}
            className="flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#e3efe8] bg-white px-1 py-2.5 text-[11.5px] font-bold text-[#10241a] transition-transform active:scale-95 dark:border-white/10 dark:bg-[#17211b] dark:text-[#dbe8e0]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8f5ed] text-[#005931] dark:bg-[#1f3328] dark:text-[#8fe0b4]">
              <Icon size={17} strokeWidth={2.3} />
            </span>
            {link.label}
          </button>
        );
      })}
    </nav>
  );
}
