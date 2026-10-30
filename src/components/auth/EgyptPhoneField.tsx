import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { egyptianPhoneStartError } from '@/utils/egyptPhone';

type EgyptPhoneFieldProps = Omit<React.ComponentProps<typeof Input>, 'dir' | 'type' | 'inputMode'>;

/** The locked +20 stays on the visual left while the page layout stays RTL. */
export default function EgyptPhoneField({ className, ...props }: EgyptPhoneFieldProps) {
  const feedbackId = React.useId();
  const currentValue = typeof props.value === 'string' ? props.value : typeof props.defaultValue === 'string' ? props.defaultValue : '';
  const startError = egyptianPhoneStartError(currentValue);

  return (
    <div className="w-full">
      <div
        dir="ltr"
        className={cn(
          'flex min-h-14 w-full items-stretch overflow-hidden rounded-2xl border border-[#cbdcd1] bg-[#fbfdfc] transition focus-within:border-[#005931] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#005931]/10',
          startError && 'border-red-300 focus-within:border-red-400 focus-within:ring-red-100',
        )}
      >
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
          aria-invalid={Boolean(startError) || props['aria-invalid'] === true || props['aria-invalid'] === 'true'}
          aria-describedby={startError ? [props['aria-describedby'], feedbackId].filter(Boolean).join(' ') : props['aria-describedby']}
          className={cn('auth-phone-input min-w-0 flex-1 !h-auto !min-h-0 !border-0 !bg-transparent px-3 text-left text-base font-semibold !shadow-none !outline-none !ring-0 focus-visible:!ring-0', className)}
        />
      </div>
      {startError && (
        <p id={feedbackId} role="alert" className="mt-2 text-right text-sm font-medium text-red-700">
          {startError}
        </p>
      )}
    </div>
  );
}
