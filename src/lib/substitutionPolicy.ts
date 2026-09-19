export type SubstitutionPolicy = 'allow_substitutions' | 'contact_me' | 'remove_item';

export const DEFAULT_SUBSTITUTION_POLICY: SubstitutionPolicy = 'contact_me';

export function normalizeSubstitutionPolicy(value: unknown): SubstitutionPolicy {
  return value === 'allow_substitutions' || value === 'remove_item' || value === 'contact_me'
    ? value
    : DEFAULT_SUBSTITUTION_POLICY;
}

export const substitutionPolicyLabel = (value: SubstitutionPolicy) => {
  if (value === 'allow_substitutions') return 'اسمح ببديل مناسب';
  if (value === 'remove_item') return 'احذف الصنف لو مش موجود';
  return 'اسألني قبل الاستبدال';
};
