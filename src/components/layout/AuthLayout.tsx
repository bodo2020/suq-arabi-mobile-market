import React from 'react';
import { Link } from 'react-router-dom';
import BrandMark from '@/components/brand/BrandMark';
import BrandWordmark from '@/components/brand/BrandWordmark';
import './auth.css';

type AuthLayoutProps = {
  children: React.ReactNode;
  variant?: 'welcome' | 'flow';
};

/** The official shopping-bag mark leads the screen; only initial login has a wordmark welcome. */
export default function AuthLayout({ children, variant = 'flow' }: AuthLayoutProps) {
  const isWelcome = variant === 'welcome';

  return (
    <main className={`auth-page auth-page--${variant}`} dir="rtl">
      <header className={`auth-brand auth-brand--${variant}`}>
        <Link to="/" className="auth-brand-mark-link" aria-label="الرجوع للرئيسية">
          <BrandMark variant="mark" className={isWelcome ? 'auth-bag-mark auth-bag-mark--welcome' : 'auth-bag-mark auth-bag-mark--flow'} />
        </Link>
        {isWelcome && (
          <h1 className="auth-welcome-heading">
            <span className="auth-welcome-greeting">يا أهلاً بيك في</span>
            <BrandWordmark className="brand-name--home auth-welcome-wordmark" />
          </h1>
        )}
      </header>
      <div className="auth-surface">{children}</div>
    </main>
  );
}
