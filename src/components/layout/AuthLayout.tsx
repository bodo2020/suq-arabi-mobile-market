import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import BrandWordmark from '@/components/brand/BrandWordmark';
import BrandMark from '@/components/brand/BrandMark';
import './auth.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <main className="auth-page" dir="rtl">
      <header className="auth-brand">
        <Link to="/" className="auth-brand-link" aria-label="سوبر ماركو — الرئيسية">
          <span className="auth-brand-symbol"><BrandMark variant="mark" className="h-10 w-[30px]" /></span>
          <BrandWordmark />
        </Link>
        <Link to="/" className="auth-guest">تصفح كضيف</Link>
      </header>
      <div className="auth-surface">
        <div className="auth-eyebrow"><ShieldCheck size={17} aria-hidden="true" />
          {pathname === '/register' ? 'رقمك اتأكد · كمّل حسابك' : 'حسابك في سوبر ماركو'}
        </div>
        {children}
      </div>
      <footer className="auth-footer">لا تشارك رمز التحقق أو كلمة المرور مع أي شخص.</footer>
    </main>
  );
}
