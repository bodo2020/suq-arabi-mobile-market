import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import HeaderBrand from '@/components/layout/header/HeaderBrand';
import './auth.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <main className="auth-page" dir="rtl">
      <header className="auth-brand">
        <HeaderBrand className="auth-brand-link" />
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
