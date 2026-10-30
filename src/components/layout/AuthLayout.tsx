import React from 'react';
import HeaderBrand from '@/components/layout/header/HeaderBrand';
import './auth.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-page" dir="rtl">
      <header className="auth-brand">
        <HeaderBrand />
      </header>
      <div className="auth-surface">{children}</div>
    </main>
  );
}
