import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import {
  BranchRuntimeContext,
  loadBranchRuntimeContext,
  resetBranchRuntimeCache,
} from '@/lib/branchRuntime';

type BranchContextValue = {
  branch: BranchRuntimeContext | null;
  branchLoading: boolean;
  branchError: string | null;
  refreshBranch: () => Promise<BranchRuntimeContext | null>;
};

const BranchContext = createContext<BranchContextValue | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useUser();
  const [branch, setBranch] = useState<BranchRuntimeContext | null>(null);
  const [branchLoading, setBranchLoading] = useState(true);
  const [branchError, setBranchError] = useState<string | null>(null);

  const refreshBranch = useCallback(async () => {
    if (authLoading) return null;
    setBranchLoading(true);
    setBranchError(null);
    resetBranchRuntimeCache();
    try {
      const next = await loadBranchRuntimeContext(true);
      setBranch(next);
      return next;
    } catch (error) {
      console.error('Failed to resolve branch runtime:', error);
      setBranch(null);
      setBranchError('تعذر تحديد فرع التوصيل.');
      return null;
    } finally {
      setBranchLoading(false);
    }
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (authLoading) return;
    void refreshBranch();
  }, [authLoading, user?.id, refreshBranch]);

  useEffect(() => {
    const refresh = () => { void refreshBranch(); };
    window.addEventListener('online', refresh);
    window.addEventListener('guest-address-changed', refresh);
    window.addEventListener('delivery-address-changed', refresh);
    window.addEventListener('customer-profile-ready', refresh);
    return () => {
      window.removeEventListener('online', refresh);
      window.removeEventListener('guest-address-changed', refresh);
      window.removeEventListener('delivery-address-changed', refresh);
      window.removeEventListener('customer-profile-ready', refresh);
    };
  }, [refreshBranch]);

  return (
    <BranchContext.Provider value={{ branch, branchLoading, branchError, refreshBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const value = useContext(BranchContext);
  if (!value) throw new Error('useBranch must be used within BranchProvider');
  return value;
}

