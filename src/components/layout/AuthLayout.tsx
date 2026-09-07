import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, ShieldCheck } from 'lucide-react';
import './auth.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <main className="auth-page" dir="rtl">
      <header className="auth-brand">
        <Link to="/" className="auth-brand-link" aria-label="المعداوي ماركت — الرئيسية">
          <img src="/elmadawy-logo.png" alt="" width="49" height="49" className="rounded-xl" />
          <span>المعداوي <strong>ماركت</strong></span>
        </Link>
        <Link to="/" className="auth-guest">تصفح كضيف</Link>
      </header>
      <div className="auth-surface">
        <div className="auth-eyebrow"><ShieldCheck size={18} aria-hidden="true" />
          {pathname === '/register' ? 'رقمك اتأكد · كمّل حسابك' : 'حسابك في المعداوي'}
        </div>
        {children}
      </div>
      <footer className="auth-footer">لا تشارك رمز التحقق أو كلمة المرور مع أي شخص.</footer>
    </main>
  );
}
