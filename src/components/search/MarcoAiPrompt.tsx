import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, Search, PackageCheck, MapPin } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useBranch } from '@/contexts/BranchContext';
import { supabase, type Product } from '@/lib/supabase';
import { searchBranchProductsIncludingUnavailable } from '@/lib/searchCatalog';
import { useToast } from '@/hooks/use-toast';
import BrandMark from '@/components/brand/BrandMark';
import ProductCard from '@/components/ui/ProductCard';
import { interpretMarkoResponse } from '@/lib/markoAi';

const examples = ['عايز أعمل كشري لستة', 'دورلي على رز ٥ كيلو', 'عايز شيبسي عائلي'];
const PREVIEW_LIMIT = 4;

type CatalogReply = {
  question: string;
  searchQuery: string;
  availableProducts: Product[];
};

/**
 * Marko understands the customer's request but never creates prices, stock,
 * SKUs or cart lines. The existing address-scoped catalog is authoritative.
 * ProductCard is the existing UI for explicit add-to-cart actions.
 */
export default function MarcoAiPrompt() {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [reply, setReply] = useState<CatalogReply | null>(null);
  const requestSequence = useRef(0);
  const { user } = useUser();
  const { branch, branchLoading } = useBranch();
  const branchId = branch?.delivery_branch_id || null;
  const navigate = useNavigate();
  const { toast } = useToast();

  // A delivery-address/branch change must invalidate any catalog result
  // returned by an earlier request. This also prevents stale async updates.
  useEffect(() => {
    requestSequence.current += 1;
    setReply(null);
    setPending(false);
  }, [branchId]);

  useEffect(() => () => { requestSequence.current += 1; }, []);

  const openFullResults = (query: string) =>
    navigate('/search?q=' + encodeURIComponent(query));

  const submit = async () => {
    const text = message.trim();
    if (text.length < 3 || pending) return;
    if (!user?.id) {
      toast({ title: 'سجل دخول عشان تسأل ماركو' });
      navigate('/phone-login');
      return;
    }
    if (!branchId) {
      toast({
        title: branchLoading ? 'بنجدد بيانات فرع التوصيل، جرّب كمان لحظة' : 'حدد عنوان التوصيل عشان نعرض المنتجات المتاحة ليك',
      });
      if (!branchLoading) navigate('/address-manager');
      return;
    }

    const sequence = ++requestSequence.current;
    setPending(true);
    setReply(null);
    try {
      const { data, error } = await supabase.functions.invoke('marko-ai-engine', {
        body: { mode: 'customer_shopping', message: text },
      });
      if (sequence !== requestSequence.current) return;
      const response = data as Record<string, unknown> | null;
      if (error || response?.error) {
        const code = String(response?.error || '');
        toast({
          title: code === 'daily_limit' ? 'وصلت للحد المجاني النهارده، جرب بكرة' : 'ماركو مش متاح دلوقتي، استخدم البحث العادي',
          variant: 'destructive',
        });
        return;
      }

      const intent = interpretMarkoResponse(response);
      if (intent.kind === 'group') {
        // Smart shopping groups already validate published recipes and
        // re-check their products, quantities and prices before cart changes.
        navigate('/ala-mazagak/' + encodeURIComponent(intent.slug), {
          state: { people: intent.people, budget: intent.budget },
        });
      } else if (intent.kind === 'search') {
        // Use the exact same branch/address scoped search as /search.
        // Never use a model-provided SKU, price, stock or image.
        const products = await searchBranchProductsIncludingUnavailable(intent.query, 32, true);
        if (sequence !== requestSequence.current) return;
        const availableProducts = products
          .filter(product => Number(product.quantity || 0) > 0 && Number(product.price || 0) > 0)
          .slice(0, PREVIEW_LIMIT);
        setReply({ question: text, searchQuery: intent.query, availableProducts });
      } else {
        toast({
          title: 'قولي اسم منتج معين أو أكلة عايز تجهزها',
          description: 'ماركو حاليًا بيساعدك تلاقي منتجات أو مجموعات. الطلبات اللي فيها أصناف كتير لسه محتاجة تطوير.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast({
        title: message.includes('DELIVERY_ADDRESS_REQUIRED')
          ? 'حدد عنوان التوصيل عشان نعرض المنتجات المتاحة ليك'
          : 'مش قادرين نجيب المنتجات دلوقتي، جرّب البحث العادي',
        variant: 'destructive',
      });
    } finally {
      if (sequence === requestSequence.current) setPending(false);
    }
  };

  return (
    <section aria-label="ماركو AI مساعد التسوق" className="rounded-[22px] border border-[#cde5d6] bg-gradient-to-l from-[#e8f7ee] via-[#f5fbf7] to-white p-3.5 shadow-[0_5px_17px_rgba(0,89,49,.045)] sm:p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
          <BrandMark variant="mark" className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-1.5 text-base font-black text-[#005931]">
            ماركو AI <Sparkles size={17} aria-hidden="true" className="text-[#d5a20c]" />
          </h2>
          <p className="text-xs font-medium leading-5 text-[#3d7259]">قول لماركو محتاج إيه، وهو يجيبلك اختيارات من المنتجات المتاحة</p>
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); void submit(); }} className="flex gap-2">
        <input
          aria-label="اسأل ماركو بالمصري"
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, 240))}
          disabled={pending}
          placeholder="زي: عايز رز ٥ كيلو أو كشري لستة…"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#d2e6d8] bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#005931] focus:ring-1 focus:ring-[#005931] disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={pending || message.trim().length < 3}
          aria-label="اسأل ماركو"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#005931] text-white transition-colors hover:bg-[#004226] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005931] disabled:opacity-50"
        >
          {pending
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none" aria-hidden="true" />
            : <ArrowLeft size={21} aria-hidden="true" />}
        </button>
      </form>
      {pending && <p role="status" className="mt-2 text-xs text-[#005931]">ماركو بيفهم طلبك وبيجيب المنتجات من فرعك…</p>}
      <div aria-label="أمثلة لطلبات ماركو" className="mt-3 flex flex-wrap gap-1.5">
        {examples.map((example, index) => (
          <button key={example} type="button" onClick={() => setMessage(example)} disabled={pending}
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[#d3e7da] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#005931] transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931] disabled:opacity-60">
            {index === 0 ? <PackageCheck size={12} aria-hidden="true" /> : <Search size={12} aria-hidden="true" />}
            {example}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[#557264]">ماركو بيقترح بس. المنتجات والأسعار من كتالوج فرع التوصيل، وأي إضافة للسلة باختيارك.</p>

      {reply && (
        <div className="mt-4 space-y-3 border-t border-[#d3e8da] pt-4" aria-label="رد ماركو على طلبك">
          <div className="flex justify-start">
            <p className="max-w-[90%] rounded-2xl rounded-tr-sm bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700">
              {reply.question}
            </p>
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-[#dcf2e3] px-3.5 py-3" role="status">
            <p className="text-sm font-bold text-[#005931]">
              {reply.availableProducts.length
                ? 'لقيتلك اختيارات موجودة في المنتجات المتاحة لعنوانك. اختار اللي يعجبك:'
                : 'ملقيتش اختيار متاح مطابق لطلبك في العنوان الحالي.'}
            </p>
            {!reply.availableProducts.length && (
              <p className="mt-1 text-xs text-[#386852]">جرّب اسم أبسط للمنتج أو اتأكد من عنوان التوصيل.</p>
            )}
          </div>
          {reply.availableProducts.length > 0 && (
            <div className="hide-scrollbar -mx-1 flex snap-x snap-proximity gap-2.5 overflow-x-auto px-1 pb-2" dir="rtl"
              aria-label="ترشيحات ماركو من المنتجات الحقيقية">
              {reply.availableProducts.map(product => (
                <div key={[product.id, product.marketplace_listing_id || 'owned'].join(':')}
                  className="w-[155px] shrink-0 snap-start sm:w-[185px]">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => openFullResults(reply.searchQuery)}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#a5d4b7] bg-white px-3 text-xs font-bold text-[#005931] transition-colors hover:bg-emerald-50"
          >
            <Search size={16} aria-hidden="true" />
            عرض كل نتائج البحث عن «{reply.searchQuery}»
            <ArrowLeft size={15} aria-hidden="true" />
          </button>
          {!branchId && (
            <button type="button" onClick={() => navigate('/address-manager')}
              className="flex min-h-10 items-center gap-2 text-xs font-bold text-[#005931]">
              <MapPin size={14} aria-hidden="true" /> تحديد عنوان التوصيل
            </button>
          )}
        </div>
      )}
    </section>
  );
}
