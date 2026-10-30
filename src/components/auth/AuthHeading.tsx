import type { LucideIcon } from 'lucide-react';

type AuthHeadingProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export default function AuthHeading({ icon: Icon, title, description }: AuthHeadingProps) {
  return (
    <header className="auth-heading">
      <div className="auth-feature-icon"><Icon size={27} strokeWidth={2.2} aria-hidden="true" /></div>
      <h1 className="text-2xl font-black text-slate-950">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
    </header>
  );
}
