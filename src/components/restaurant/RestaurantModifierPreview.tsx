import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getRestaurantListingModifierPreview, quoteRestaurantModifierTryOn,
} from "@/lib/customerRestaurantModifiers";
import {
  evaluateRestaurantModifiers,
  type RestaurantModifierGroup, type RestaurantModifierPick,
} from "@/lib/restaurantModifiers";

const money = (value: number) => Number(value || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 });

/**
 * Customer can TRY configurations against an authoritative server quote.
 * No chosen options are written to a cart or submitted through legacy checkout.
 */
export default function RestaurantModifierPreview({ branchId, productId, basePrice }: {
  branchId: string; productId: string; basePrice: number;
}) {
  const [picks, setPicks] = useState<RestaurantModifierPick[]>([]);
  const menu = useQuery({
    queryKey: ["restaurant-modifier-preview", branchId, productId],
    queryFn: () => getRestaurantListingModifierPreview(branchId, productId),
    staleTime: 30_000,
    retry: false,
  });
  const groups = useMemo(() => menu.data?.groups || [], [menu.data?.groups]);
  const evaluation = useMemo(() => {
    if (!menu.data?.configurable) return null;
    try { return evaluateRestaurantModifiers(groups, picks); }
    catch { return null; }
  }, [groups, picks, menu.data?.configurable]);
  const quote = useQuery({
    queryKey: ["restaurant-option-tryon", branchId, productId, evaluation?.selection_key],
    queryFn: () => quoteRestaurantModifierTryOn(branchId, productId, evaluation!.picks),
    enabled: Boolean(evaluation),
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const count = (groupId: string, optionId: string) =>
    picks.find(pick => pick.group_id === groupId && pick.option_id === optionId)?.quantity || 0;

  const change = (group: RestaurantModifierGroup, optionId: string, quantity: number) => {
    const option = group.options.find(item => item.id === optionId);
    if (!option || option.active === false || quantity < 0 || quantity > (option.max_quantity ?? 1)) return;
    setPicks(current => {
      const other = current.filter(item => item.group_id !== group.id || item.option_id !== optionId);
      const withoutChoice = group.max_choices === 1 && quantity > 0
        ? other.filter(item => item.group_id !== group.id) : other;
      const chosen = quantity > 0 ? [...withoutChoice, { group_id: group.id, option_id: optionId, quantity }] : withoutChoice;
      const groupCount = chosen.filter(item => item.group_id === group.id).reduce((sum, item) => sum + item.quantity, 0);
      return groupCount <= group.max_choices ? chosen : current;
    });
  };

  // Older backends don't expose the read RPC; leave ordinary product checkout intact.
  if (!menu.data?.configurable) return null;

  const verified = evaluation && quote.data && !quote.isFetching && !quote.isError
    ? quote.data : null;

  return <section aria-label="تجربة خيارات الوجبة" dir="rtl"
    className="mt-5 space-y-4 rounded-2xl border border-[#e7cd80] bg-[#fffaf0] p-4">
    <div>
      <h2 className="font-black text-[#005931]">جرّب تخصيص وجبتك</h2>
      <p className="mt-1 text-xs leading-6 text-slate-700">
        اختار الحجم والإضافات علشان تشوف السعر محسوب من المطعم.
        <strong> دي تجربة فقط: اختياراتك مش هتتضاف للسلة، وزر الشراء الحالي بيطلب الصنف الأساسي من غير إضافات.</strong>
      </p>
    </div>
    {groups.filter(group => group.active !== false).map(group =>
      <div key={group.id} className="space-y-2 rounded-xl bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-sm">{group.name}</h3>
          <span className="text-[11px] text-slate-500">
            {group.min_choices > 0 ? "إجباري" : "اختياري"} · {group.min_choices}–{group.max_choices}
          </span>
        </div>
        {group.options.filter(option => option.active !== false).map(option => {
          const selected = count(group.id, option.id);
          const groupTotal = picks.filter(pick => pick.group_id === group.id).reduce((sum, pick) => sum + pick.quantity, 0);
          const canIncrease = selected < (option.max_quantity ?? 1) && (group.max_choices === 1 || groupTotal < group.max_choices);
          return <div key={option.id} className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-2">
            <div className="min-w-0">
              <strong className="block text-sm text-[#005931]">{option.name}</strong>
              <span className="text-xs text-slate-500">{Number(option.price_delta) > 0 ? "+" + money(option.price_delta) + " ج.م" : "مجاني"}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {group.max_choices === 1
                ? <button type="button" aria-label={"اختار " + option.name}
                    aria-pressed={selected > 0} onClick={() => change(group, option.id, 1)}
                    className={"min-h-10 rounded-lg border px-3 text-xs font-bold " + (selected ? "bg-[#005931] text-white" : "bg-white text-[#005931]")}>
                    {selected ? "تم الاختيار" : "اختيار"}
                  </button>
                : <>
                  <button type="button" aria-label={"تقليل " + option.name} disabled={selected <= 0}
                    className="h-10 w-10 rounded-lg border bg-white disabled:opacity-40"
                    onClick={() => change(group, option.id, selected - 1)}>−</button>
                  <span className="w-5 text-center text-sm font-bold">{selected}</span>
                  <button type="button" aria-label={"زيادة " + option.name} disabled={!canIncrease}
                    className="h-10 w-10 rounded-lg border bg-white disabled:opacity-40"
                    onClick={() => change(group, option.id, selected + 1)}>+</button>
                </>}
            </div>
          </div>;
        })}
      </div>)}

    <div className="rounded-xl border border-dashed border-[#dfba58] p-3" aria-live="polite">
      {!evaluation ? <p className="text-sm font-semibold text-amber-800">كمّل الاختيارات الإجبارية علشان نحسب السعر.</p>
        : quote.isLoading || quote.isFetching ? <p className="text-sm">بنتأكد من السعر عند المطعم…</p>
        : quote.isError || !verified ? <p className="text-sm text-red-700">تعذر تأكيد سعر الإضافات؛ جرّب تاني.</p>
        : <>
          <p className="text-sm">إجمالي الإضافات بعد تحقق الخادم: <strong>{money(Number(verified.price_delta))} ج.م</strong></p>
          <p className="text-sm font-black text-[#005931]">سعر الوجبة في المعاينة: {money(basePrice + Number(verified.price_delta))} ج.م</p>
        </>}
      <p className="mt-1 text-xs text-slate-500">السعر المعروض للمعاينة فقط، ومش سعرًا مؤكدًا لطلب فعلي.</p>
    </div>
  </section>;
}
