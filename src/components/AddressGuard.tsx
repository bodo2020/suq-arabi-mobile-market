import React from 'react';

// Connectivity is displayed by NetworkStatus. Never unmount pages when the
// network drops: this preserves forms and lets cached products/cart remain usable.
export default function AddressGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
