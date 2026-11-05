import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import {
  BranchRuntimeContext,
  loadBranchRuntimeContext,
  peekBranchRuntime,
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
  const queryClient = useQueryClient();
  // Start from the branch saved on this device so the app can render the
  // catalog immediately; the effect below re-checks it in the background.
  const [branch, setBranch] = useState<BranchRuntimeContext | null>(() => peekBranchRuntime());
  const [branchLoading, setBranchLoading] = useState(() => !peekBranchRuntime());
  const [branchError, setBranchError] = useState<string | null>(null);
  const lastUserId = useRef<string | null | undefined>(undefined);

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

  // Background re-check of the saved branch. If it turns out different, every
  // query that depended on the old branch is refetched.
  const revalidateBranch = useCallback(async () => {
    const shown = peekBranchRuntime();
    if (!shown) setBranchLoading(true);
    try {
      const next = await loadBranchRuntimeContext(true);
      setBranch(next);
      setBranchError(null);
      if (shown && next?.delivery_branch_id !== shown.delivery_branch_id) {
        void queryClient.invalidateQueries();
      }
      return next;
    } catch (error) {
      console.error('Failed to resolve branch runtime:', error);
      if (!shown) {
        setBranch(null);
        setBranchError('تعذر تحديد فرع التوصيل.');
      }
      return null;
    } finally {
      setBranchLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    if (authLoading) return;
    const userId = user?.id ?? null;
    const firstRun = lastUserId.current === undefined;
    lastUserId.current = userId;
    // First start: keep showing the saved branch and re-check quietly.
    // A different account signing in gets a full fresh lookup.
    if (firstRun) void revalidateBranch();
    else void refreshBranch();
  }, [authLoading, user?.id, refreshBranch, revalidateBranch]);

  useEffect(() => {
    const refresh = () => { void refreshBranch(); };
    window.addEventListener('guest-address-changed', refresh);
    window.addEventListener('delivery-address-changed', refresh);
    window.addEventListener('customer-profile-ready', refresh);
    return () => {
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
