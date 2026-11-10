/**
 * Soft colour per category card and the quick-filter group it belongs to,
 * chosen from the category name so new categories get a sensible look
 * without any setup.
 */
export type CategoryGroup = 'fresh' | 'pantry' | 'drinks' | 'snacks' | 'home';

export const CATEGORY_GROUPS: Array<{ value: CategoryGroup | 'all'; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'fresh', label: 'طازج' },
  { value: 'pantry', label: 'بقالة' },
  { value: 'drinks', label: 'مشروبات' },
  { value: 'snacks', label: 'سناكس' },
  { value: 'home', label: 'البيت' },
];

const RULES: Array<{ match: RegExp; color: string; group?: CategoryGroup }> = [
  { match: /خضار|خضر|فاكه/, color: '#e6f5e9', group: 'fresh' },
  { match: /آيس|ايس كريم/, color: '#fde8ef', group: 'snacks' },
  { match: /البان|ألبان|بيض|جبن/, color: '#e7f0fb', group: 'fresh' },
  { match: /لحو|دواجن|فراخ/, color: '#fcebeb', group: 'fresh' },
  { match: /خبز|مخبوز/, color: '#fdf2df', group: 'fresh' },
  { match: /مجمد/, color: '#e4f3f8', group: 'fresh' },
  { match: /معلب|اغذي|أغذي|صوص/, color: '#fdeee4', group: 'pantry' },
  { match: /بقال/, color: '#f5efe2', group: 'pantry' },
  { match: /مطبخ|حلويات والطبخ|عطار/, color: '#f0eaf8', group: 'pantry' },
  { match: /فطار|مربى|مربي/, color: '#fff3d4', group: 'pantry' },
  { match: /شاي|قهو/, color: '#f2ebe4', group: 'drinks' },
  { match: /مشروب|عصير/, color: '#e3f4f1', group: 'drinks' },
  { match: /سناك|شيكولات|حلوي/, color: '#fff0c9', group: 'snacks' },
  { match: /منظف|غسيل/, color: '#ebeafa', group: 'home' },
  { match: /جمال|عناي/, color: '#fbe9f2', group: 'home' },
  { match: /صح|صيدل/, color: '#e8f4f0', group: 'home' },
  { match: /وجبات|مطاعم/, color: '#fde9df' },
];

const FALLBACK = ['#eef4f0', '#f6efe6', '#eaf1fa', '#f8ecf1', '#eef0e3'];

export function categoryStyle(name: string, index: number): { color: string; group: CategoryGroup | null } {
  const rule = RULES.find(entry => entry.match.test(name || ''));
  return { color: rule?.color || FALLBACK[index % FALLBACK.length], group: rule?.group || null };
}
