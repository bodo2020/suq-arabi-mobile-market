type RecoveryProof = { userId: string; phone: string; verifiedAt: number };
const key = 'phone-recovery-proof';
export const normalizeRecoveryPhone = (phone: string) => `+${phone.replace(/\D/g, '')}`;
export function recoveryProofMatches(proof: RecoveryProof | null, user: { id: string; phone?: string; phone_confirmed_at?: string }, now = Date.now()) {
  return Boolean(proof && proof.userId === user.id && user.phone && user.phone_confirmed_at
    && proof.phone === normalizeRecoveryPhone(user.phone) && now >= proof.verifiedAt && now - proof.verifiedAt <= 10 * 60_000);
}
// Navigation guard only. Supabase validates the session and authorizes password writes server-side.
export function savePhoneRecoveryProof(userId: string, phone: string) {
  sessionStorage.setItem(key, JSON.stringify({ userId, phone: normalizeRecoveryPhone(phone), verifiedAt: Date.now() }));
}
export function readPhoneRecoveryProof(): RecoveryProof | null {
  try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; }
}
export function clearPhoneRecoveryProof() { try { sessionStorage.removeItem(key); } catch { /* optional storage */ } }
