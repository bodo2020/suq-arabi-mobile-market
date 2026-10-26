import React, { useRef } from 'react';
import { ChevronLeft, Layers3 } from 'lucide-react';

/** A deliberate upward gesture at the end of a category, never an accidental scroll redirect. */
export default function NextCategoryPrompt({ name, onNext }: { name: string; onNext: () => void }) {
  const touchY = useRef<number | null>(null);
  return (
    <section
      className="group mt-6 rounded-[26px] border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-4 shadow-sm sm:p-5"
      aria-label={`انتقل إلى القسم التالي: ${name}`}
      onTouchStart={event => { touchY.current = event.touches[0]?.clientY ?? null; }}
      onTouchEnd={event => {
        const end = event.changedTouches[0]?.clientY;
        const start = touchY.current;
        touchY.current = null;
        if (start === null || end === undefined) return;
        const vertical = start - end;
        if (vertical > 70) onNext();
      }}
      onTouchCancel={() => { touchY.current = null; }}
    >
      <button type="button" onClick={onNext} className="flex min-h-16 w-full items-center gap-3 text-right active:scale-[.99]">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#005931] text-white">
          <Layers3 size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-slate-500">خلصت منتجات القسم؟</span>
          <strong className="mt-1 block truncate text-base font-black text-[#005931]">اكتشف {name}</strong>
          <span className="mt-1 block text-[11px] text-slate-500 sm:hidden">اسحب لفوق أو اضغط للانتقال</span>
        </span>
        <ChevronLeft className="shrink-0 text-[#005931] transition-transform group-hover:-translate-x-1" size={22} />
      </button>
    </section>
  );
}
