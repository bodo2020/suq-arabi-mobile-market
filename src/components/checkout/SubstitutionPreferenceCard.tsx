import { MessageCircle, PackageX, RefreshCcw } from 'lucide-react';
import type { SubstitutionPolicy } from '@/lib/substitutionPolicy';
import '@/pages/payment.css';

type Props = {
  value: SubstitutionPolicy;
  onChange: (value: SubstitutionPolicy) => void;
  disabled?: boolean;
};

const options: Array<{
  value: SubstitutionPolicy;
  title: string;
  description: string;
  icon: typeof RefreshCcw;
}> = [
  {
    value: 'allow_substitutions',
    title: 'بديل مناسب',
    description: 'لو البديل بنفس السعر أو أقل هنكمل تلقائيًا. أي زيادة في السعر هتحتاج موافقتك.',
    icon: RefreshCcw,
  },
  {
    value: 'contact_me',
    title: 'اسألني الأول',
    description: 'لو صنف ناقص هنبعتلك البديل في الطلب وتوافق أو ترفض من التطبيق.',
    icon: MessageCircle,
  },
  {
    value: 'remove_item',
    title: 'شيله من الطلب',
    description: 'مش هنبدله. الصنف الناقص هيتشال ويتعدل حساب الطلب تلقائيًا.',
    icon: PackageX,
  },
];

/** Compact three-way choice; the explanation of the chosen option sits below. */
export default function SubstitutionPreferenceCard({ value, onChange, disabled = false }: Props) {
  const current = options.find(option => option.value === value) || options[0];
  return (
    <section className="pay-block">
      <header className="pay-block__head">
        <span className="pay-block__icon"><RefreshCcw size={18} /></span>
        <h2>لو منتج مش متوفر</h2>
      </header>
      <div className="pay-subs" role="radiogroup" aria-label="لو منتج مش متوفر">
        {options.map(option => {
          const Icon = option.icon;
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => !disabled && onChange(option.value)}
              className={`pay-sub ${selected ? 'is-selected' : ''}`}
            >
              <Icon size={20} />
              {option.title}
            </button>
          );
        })}
      </div>
      <p className="pay-sub-hint">{current.description}</p>
      {disabled && (
        <p className="mt-2 text-xs leading-5 text-amber-700">
          اختيار البدائل مقفول على محاولة الطلب الحالية حتى لا تتغير شروط نفس المحاولة.
        </p>
      )}
    </section>
  );
}
