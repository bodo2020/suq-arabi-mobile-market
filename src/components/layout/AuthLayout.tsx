import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import './auth.css';
import { BRAND_NAME, BRAND_WORDMARK } from '@/lib/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <main className="auth-page" dir="rtl">
      <header className="auth-brand">
        <Link to="/" className="auth-brand-link" aria-label={`${BRAND_NAME} — الرئيسية`}>
          <img src={BRAND_WORDMARK} alt="" width="170" height="81" />
        </Link>
        <Link to="/" className="auth-guest">تصفح كضيف</Link>
      </header>
      <div className="auth-surface">
        <div className="auth-eyebrow"><ShieldCheck size={18} aria-hidden="true" />
          {pathname === '/register' ? 'رقمك اتأكد · كمّل حسابك' : `حسابك في ${BRAND_NAME}`}
        </div>
        {children}
      </div>
      <footer className="auth-footer">لا تشارك رمز التحقق أو كلمة المرور مع أي شخص.</footer>
    </main>
  );
}
