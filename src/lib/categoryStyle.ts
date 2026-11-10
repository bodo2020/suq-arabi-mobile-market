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

/**
 * Section artwork shipped with the app (public/categories): unbranded 3D
 * renders with transparent backgrounds, one per section id. Sections without
 * artwork fall back to a collage of their own product photos.
 */
const CATEGORY_ART: Record<string, string> = {
  'e644b3d7-fe97-451c-a68f-b48c7f324d42': 'produce',
  '3fdb0647-7e4f-40ae-a79a-a51caf293fff': 'dairy',
  'c89f765e-cda6-4f93-9e50-2fe1257a1458': 'meat',
  '68184c01-9fd9-42be-a404-ad5191a4971b': 'bakery',
  '0c3f0640-9a43-4ce5-9e1c-fd02849bb14e': 'frozen',
  '0cd7a5de-c036-5f57-9e46-16f9fe020d2c': 'icecream',
  'f7ca04c5-6b95-47fc-8fee-3fea08797196': 'pantry',
  '016d7b69-c8ad-4a0d-aab9-b64ee956b740': 'canned',
  '4975b9ae-f79e-5a8b-9d2a-273d7d66e1d1': 'breakfast',
  '7c87376b-64a2-456b-a984-5c56d5a05df2': 'drinks',
  '163c7553-3436-5d07-8af2-26253c98f227': 'teacoffee',
  'c6f84011-2da7-4300-901f-babe96d3f235': 'snacks',
  '82cabc47-a65a-4692-8865-96ad4f3e4921': 'baking',
  'ae1e2200-28b6-4adb-99fb-bb8c44fe15f9': 'cleaning',
  '123ee398-fed0-5cba-a4cd-b6e4da0d6e0d': 'personal',
  '3bd140d2-5eff-4d74-b17b-90d361bf9b40': 'restaurants',
  'e729c713-f821-443b-bfaa-ca695e224441': 'pharmacy',
  'd1bd6fc9-ce4c-466a-898e-8296a925876e': 'beauty',
};

export function categoryArt(categoryId: string): string | null {
  const key = CATEGORY_ART[categoryId];
  return key ? `/categories/${key}.webp` : null;
}
