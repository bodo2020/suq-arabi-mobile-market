import { MessageCircle, RefreshCcw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { SubstitutionPolicy } from '@/lib/substitutionPolicy';

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
    title: 'اسمح ببديل مناسب',
    description: 'لو البديل بنفس السعر أو أقل هنكمل تلقائيًا. أي زيادة في السعر هتحتاج موافقتك.',
    icon: RefreshCcw,
  },
  {
    value: 'contact_me',
    title: 'اسألني قبل الاستبدال',
    description: 'لو صنف ناقص هنبعتلك البديل في الطلب وتوافق أو ترفض من التطبيق.',
    icon: MessageCircle,
  },
  {
    value: 'remove_item',
    title: 'احذف الصنف لو مش موجود',
    description: 'مش هنبدله. الصنف الناقص هيتشال ويتعدل حساب الطلب تلقائيًا.',
    icon: Trash2,
  },
];

export default function SubstitutionPreferenceCard({ value, onChange, disabled = false }: Props) {
  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCcw className="h-5 w-5 text-primary" />
          لو منتج مش متوفر
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value}
          onValueChange={next => !disabled && onChange(next as SubstitutionPolicy)}
          className="space-y-3"
        >
          {options.map(option => {
            const Icon = option.icon;
            const selected = option.value === value;
            return (
              <Label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                  selected ? 'border-primary bg-green-50' : 'hover:border-emerald-200 hover:bg-gray-50'
                } ${disabled ? 'cursor-default opacity-70' : ''}`}
              >
                <RadioGroupItem value={option.value} disabled={disabled} className="mt-1" />
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>
                  <strong className="block text-sm">{option.title}</strong>
                  <small className="mt-1 block leading-5 text-gray-500">{option.description}</small>
                </span>
              </Label>
            );
          })}
        </RadioGroup>
        {disabled && (
          <p className="mt-3 text-xs leading-5 text-amber-700">
            اختيار البدائل مقفول على محاولة الطلب الحالية حتى لا تتغير شروط نفس المحاولة.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
