import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

/** Optional authenticated AI intent routing. The model does NOT compose
 * unverified recipes or sell products; it chooses a published shopping group. */
export default function MarcoAiPrompt() {
  const [message,setMessage] = useState('');
  const [pending,setPending] = useState(false);
  const {user} = useUser();
  const navigate = useNavigate();
  const {toast} = useToast();

  const submit = async () => {
    const text = message.trim();
    if(text.length < 3 || pending) return;
    if(!user?.id) {
      toast({title:'سجل دخول عشان تسأل ماركو'});
      navigate('/phone-login');
      return;
    }
    setPending(true);
    try {
      const {data,error} = await supabase.functions.invoke('customer-smart-ideas',{
        body:{message:text},
      });
      const result = data as {
        error?:string; slug?:string|null; people?:number; budget?:string;
      }|null;
      if(error || result?.error) {
        const code = result?.error || '';
        toast({title:code==='daily_limit'?'جرب تاني بكرة':'ماركو مش متاح دلوقتي',variant:'destructive'});
        return;
      }
      if(!result?.slug) {
        toast({title:'مش لاقيين مجموعة مناسبة دلوقتي'});
        return;
      }
      navigate('/ala-mazagak/'+encodeURIComponent(result.slug),{
        state:{people:result.people,budget:result.budget},
      });
    } catch {
      toast({title:'جرّب تسأل ماركو تاني',variant:'destructive'});
    } finally {setPending(false);}
  };

  return (
    <section className="rounded-[22px] border border-[#d6e9dc] bg-white p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <Sparkles size={19} className="text-[#005931]" aria-hidden="true"/>
        <h2 className="text-base font-black text-[#005931]">قول لماركو نفسك في إيه</h2>
      </div>
      <form onSubmit={e=>{e.preventDefault();void submit();}} className="flex gap-2">
        <input
          aria-label="اطلب من ماركو بالمصري"
          value={message}
          onChange={e=>setMessage(e.target.value.slice(0,240))}
          placeholder="عايز أعمل كشري لستة…"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#dfece4] bg-[#f6f8f7] px-3 text-sm text-slate-900 outline-none focus:border-[#005931]"
        />
        <button type="submit" disabled={pending || message.trim().length<3}
          aria-label="جهزلي الطلب"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#005931] text-white disabled:opacity-50">
          {pending?<span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"/>:<ArrowLeft size={21}/>}
        </button>
      </form>
    </section>
  );
}
