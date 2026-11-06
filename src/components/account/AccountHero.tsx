import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import BrandText from '@/components/brand/BrandText';
import './account.css';

export type AccountHeroStat = { label: string; value: ReactNode; unit?: string };

type Props = {
  icon?: LucideIcon;
  /** Custom content for the gold badge (e.g. initials) instead of an icon. */
  badge?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  stats?: AccountHeroStat[];
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Shared green brand header for the account page and every page inside it. */
export default function AccountHero({ icon: Icon, badge, eyebrow, title, subtitle, stats, actions, children, className = '' }: Props) {
  return (
    <section className={`acc-hero ${className}`.trim()}>
      <div className="acc-hero__top">
        {(badge || Icon) && <span className="acc-hero__icon" aria-hidden="true">{badge || (Icon && <Icon size={24} strokeWidth={2.2} />)}</span>}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="acc-hero__eyebrow"><BrandText tone="dark">{eyebrow}</BrandText></p>}
          <h1 className="acc-hero__title"><BrandText tone="dark">{title}</BrandText></h1>
          {subtitle && <p className="acc-hero__sub"><BrandText tone="dark">{subtitle}</BrandText></p>}
        </div>
      </div>
      {children}
      {stats && stats.length > 0 && (
        <div className="acc-hero__stats" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
          {stats.map(stat => (
            <div key={stat.label} className="acc-hero__stat">
              <span>{stat.label}</span>
              <strong>{stat.value}{stat.unit && <small> {stat.unit}</small>}</strong>
            </div>
          ))}
        </div>
      )}
      {actions && <div className="acc-hero__actions">{actions}</div>}
    </section>
  );
}
