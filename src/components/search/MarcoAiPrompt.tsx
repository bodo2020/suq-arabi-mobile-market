import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, Search, PackageCheck } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import BrandMark from '@/components/brand/BrandMark';
import { interpretMarkoResponse } from '@/lib/markoAi';

const examples = ['عايز أعمل كشري لستة', 'دورلي على رز ٥ كيلو', 'عايز شيبسي عائلي'];

/** ماركو only routes an authenticated customer to existing, verified catalog
 * screens. No model output can add products or submit an order. */
export default function MarcoAiPrompt() {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const submit = async () => {
    const text = message.trim();
    if (text.length < 3 || pending) return;
    if (!user?.id) {
      toast({ title: 'سجل دخول عشان تسأل ماركو' });
      navigate('/phone-login');
      return;
    }

    setPending(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-smart-ideas', {
        body: { message: text },
      });
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
        navigate('/ala-mazagak/' + encodeURIComponent(intent.slug), {
          state: { people: intent.people, budget: intent.budget },
        });
      } else if (intent.kind === 'search') {
        // Only the existing branch-aware search page can show real, available
        // products and their actual prices. The model never invents SKUs.
        navigate('/search?q=' + encodeURIComponent(intent.query));
      } else {
        toast({
          title: 'قولي اسم منتج معين أو أكلة عايز تجهزها',
          description: 'دلوقتي ماركو بيساعدك تلاقي المنتجات والمجموعات، ومش بيجهز أوردر كامل لوحده.',
        });
      }
    } catch {
      toast({ title: 'ماركو مش متاح دلوقتي، جرّب البحث العادي', variant: 'destructive' });
    } finally {
      setPending(false);
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
          <p className="text-xs font-medium leading-5 text-[#3d7259]">قول لماركو محتاج إيه، وهو يساعدك توصله بسرعة</p>
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); void submit(); }} className="flex gap-2">
        <input
          aria-label="اسأل ماركو بالمصري"
          value={message}
          onChange={e => setMessage(e.target.value.slice(0,240))}
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
      {pending && <p role="status" className="mt-2 text-xs text-[#005931]">ماركو بيفهم طلبك…</p>}
      <div aria-label="أمثلة لطلبات ماركو" className="mt-3 flex flex-wrap gap-1.5">
        {examples.map((example, index) => (
          <button key={example} type="button" onClick={() => setMessage(example)} disabled={pending}
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[#d3e7da] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#005931] transition-colors hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931] disabled:opacity-60">
            {index === 0 ? <PackageCheck size={12} aria-hidden="true" /> : <Search size={12} aria-hidden="true" />}
            {example}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[#557264]">ماركو بيقترح بس. المنتجات والأسعار من كتالوج الفرع، وأي إضافة للسلة بتكون باختيارك.</p>
    </section>
  );
}
