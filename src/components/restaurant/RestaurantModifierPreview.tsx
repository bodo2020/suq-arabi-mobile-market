import { useQuery } from "@tanstack/react-query";
import { getRestaurantListingModifierPreview } from "@/lib/customerRestaurantModifiers";

const money = (value: number) => Number(value || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 });

/** Displays planned restaurant customizations. Does not collect or submit picks. */
export default function RestaurantModifierPreview({ branchId, productId }: {
  branchId: string; productId: string;
}) {
  const query = useQuery({
    queryKey: ["restaurant-modifier-preview", branchId, productId],
    queryFn: () => getRestaurantListingModifierPreview(branchId, productId),
    staleTime: 30_000,
    retry: false,
  });
  // Older servers legitimately have no modifier RPC. Keep base product checkout.
  if (!query.data?.configurable) return null;
  return <section aria-label="خيارات الوجبة القادمة" dir="rtl"
    className="mt-5 space-y-4 rounded-2xl border border-[#e7cd80] bg-[#fffaf0] p-4">
    <div>
      <h2 className="font-black text-[#005931]">تخصيص الوجبة — قريبًا</h2>
      <p className="mt-1 text-xs leading-6 text-slate-700">
        دي خيارات المنيو اللي بيجهّزها المطعم للعرض حاليًا.
        <strong> الطلب الحالي بيتسجل بالصنف الأساسي فقط، من غير أي إضافة أو تغيير في السعر.</strong>
      </p>
    </div>
    {query.data.groups.filter(group => group.active !== false).map(group =>
      <div key={group.id} className="rounded-xl bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-bold text-sm">{group.name}</h3>
          <span className="text-[11px] text-slate-500">
            {group.min_choices > 0 ? "إجباري عند التفعيل" : "اختياري"}
            {" · "}{group.min_choices}–{group.max_choices}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {group.options.filter(option => option.active !== false).map(option =>
            <span key={option.id} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-[#005931]">
              {option.name}
              {Number(option.price_delta || 0) > 0 ? ` · +${money(option.price_delta)} ج.م` : " · مجاني"}
            </span>)}
        </div>
      </div>)}
  </section>;
}
