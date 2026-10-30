import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type EgyptPhoneFieldProps = Omit<React.ComponentProps<typeof Input>, 'dir' | 'type' | 'inputMode'>;

/** A fixed, non-interactive Egyptian dial code on the RIGHT in RTL layouts. */
export default function EgyptPhoneField({ className, ...props }: EgyptPhoneFieldProps) {
  return (
    <div dir="rtl" className="flex min-h-14 w-full items-stretch overflow-hidden rounded-2xl border border-[#cbdcd1] bg-[#fbfdfc] transition focus-within:border-[#005931] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#005931]/10">
      <span className="flex shrink-0 items-center gap-2 px-3 text-[#005931]" aria-label="مصر، مفتاح الدولة ثابت +20">
        <span aria-hidden="true">🇪🇬</span>
        <bdi dir="ltr" className="font-black tabular-nums">+20</bdi>
      </span>
      <span className="my-3 w-px shrink-0 bg-[#d7e4db]" aria-hidden="true" />
      <Input
        {...props}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        dir="ltr"
        maxLength={18}
        placeholder="010 1234 5678"
        className={cn('min-w-0 flex-1 !h-auto !min-h-0 !border-0 !bg-transparent px-3 text-right text-base font-semibold !shadow-none !outline-none !ring-0 focus-visible:!ring-0', className)}
      />
    </div>
  );
}
