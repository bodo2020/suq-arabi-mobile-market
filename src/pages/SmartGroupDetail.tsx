import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CircleHelp, Minus, Plus, ShoppingBag, ExternalLink, Users, Save, Images } from 'lucide-react';
import SmartProductChoiceCard from '@/components/smart/SmartProductChoiceCard';
import SmartAlternativesDialog from '@/components/smart/SmartAlternativesDialog';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import { useBranch } from '@/contexts/BranchContext';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';
import { type Product } from '@/lib/supabase';
import { isWeightedProduct, productWeightStepGrams } from '@/lib/productPurchase';
import {
  availableSmartProduct, getSmartGroupBundle, getSmartGroups, shoppingDb,
  moneyEGP, proposedPackCount, quantityText, smartProductPrice,
} from '@/lib/smartShopping';
import { useToast } from '@/hooks/use-toast';

type SavedEntry = { slotId: string; checked: boolean; productId?: string; packs?: number };
const safeEntries = (value: unknown): SavedEntry[] =>
  Array.isArray(value) ? value.slice(0, 30).filter((entry): entry is SavedEntry =>
    entry && typeof entry === 'object' && typeof entry.slotId === 'string' &&
    typeof entry.checked === 'boolean') : [];

export default function SmartGroupDetail() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const { branch, branchLoading } = useBranch();
  const { addBundleToCart, isInitialized } = useCart();
  const branchId = branch?.delivery_branch_id;

  const groupsQuery = useQuery({ queryKey:['ala-mazagak-groups-v1'], queryFn:getSmartGroups, staleTime:300_000 });
  const group = groupsQuery.data?.find(g => g.slug === slug);
  const bundleQuery = useQuery({
    queryKey:['ala-mazagak-bundle-v1', slug, branchId],
    queryFn:() => getSmartGroupBundle(slug, branchId!),
    enabled:Boolean(group && branchId),
    staleTime:45_000, refetchOnWindowFocus:false,
  });

  const [people,setPeople] = useState(4);
  const [budget,setBudget] = useState<'simple'|'medium'|'large'>('medium');
  const [checked,setChecked] = useState<Record<string,boolean>>({});
  const [selected,setSelected] = useState<Record<string,string>>({});
  const [packs,setPacks] = useState<Record<string,number>>({});
  // Per ingredient/category: any mix of real product SKUs, rather than
  // forcing four identical snack bags on a four-person watch party.
  const [mixSelected,setMixSelected] = useState<Record<string,Record<string,number>>>({});
  const [pickerSlot,setPickerSlot] = useState<string | null>(null);
  const [adding,setAdding] = useState(false);
  const [loadingList,setLoadingList] = useState(false);
  const [saving,setSaving] = useState(false);

  useEffect(() => {
    if (!group) return;
    const suggested = location.state as { people?:number; budget?:string }|null;
    const count = Number(suggested?.people);
    setPeople([2,4,6,8].includes(count) ? count : group.base_servings);
    if (suggested?.budget === 'simple' || suggested?.budget === 'medium' || suggested?.budget === 'large')
      setBudget(suggested.budget);
  }, [group?.id, location.key]);

  const isPersonalList = group?.kind === 'list';
  const savedKey = 'super-marko-smart-list-v1:' + slug;
  useEffect(() => {
    if (!isPersonalList) return;
    let active = true;
    const load = async () => {
      setLoadingList(true);
      try {
        let entries: SavedEntry[] = [];
        const guest = localStorage.getItem(savedKey);
        if (guest) entries = safeEntries(JSON.parse(guest));
        if (user?.id) {
          const { data, error } = await shoppingDb
            .from('customer_smart_lists').select('entries')
            .eq('user_id',user.id).eq('list_key',slug).maybeSingle();
          if (!error && data?.entries) entries = safeEntries(data.entries);
        }
        if (!active) return;
        setChecked(Object.fromEntries(entries.map(x => [x.slotId,x.checked])));
        setSelected(Object.fromEntries(entries.filter(x => x.productId).map(x => [x.slotId,x.productId!])));
        setPacks(Object.fromEntries(entries.filter(x => x.packs).map(x => [x.slotId,x.packs!])));
      } catch { /* No storage access: still allow shopping without saving. */ }
      finally { if (active) setLoadingList(false); }
    };
    void load();
    return () => { active=false; };
  }, [isPersonalList, savedKey, slug, user?.id]);

  const slots = bundleQuery.data || [];
  const lines = useMemo(() => slots.map(slot => {
    const candidates = slot.products.filter(availableSmartProduct);
    const picked = candidates.find(p => p.id === selected[slot.slot_id]) || candidates[0] || null;
    const defaultIncluded = isPersonalList ? false : !slot.optional || budget === 'large' || (budget === 'medium' && group?.kind === 'occasion' && slot.position === 3);
    const enabled = checked[slot.slot_id] ?? defaultIncluded;
    const calculated = picked ? proposedPackCount(slot,picked,people,group?.base_servings || 4) : null;
    const mixTarget = Math.max(1,Math.ceil(slot.amount * people / (group?.base_servings || 4)));
    const mix = mixSelected[slot.slot_id] || {};
    const mixCount = Object.values(mix).reduce((sum,n) => sum+Math.max(0,n),0);
    const chosenMix = candidates
      .filter(product => Number(mix[product.id] || 0)>0)
      .map(product => ({product,quantity:mix[product.id]}));
    const count = packs[slot.slot_id] ?? calculated ?? 1;
    const weighted = picked ? isWeightedProduct(picked) : false;
    return { slot, picked, enabled, weighted,
      count: Math.max(1, Math.min(weighted ? 100000 : 30, count)),
      uncertain: calculated === null, mixTarget, mixCount, chosenMix };
  }), [slots, selected, checked, packs, mixSelected, people, budget, group?.base_servings, group?.kind, isPersonalList]);

  const summary = useMemo(() => {
    const active = lines.filter(line => line.enabled);
    if (group?.kind === 'occasion') {
      return {
        total: active.reduce((sum,line) => sum+line.chosenMix.reduce(
          (n,item) => n+smartProductPrice(item.product)*item.quantity,0),0),
        products: active.reduce((n,line)=>n+line.chosenMix.reduce(
          (quantity,item)=>quantity+item.quantity,0),0),
        missing: active.reduce((n,line)=>n+Math.max(0,line.mixTarget-line.mixCount),0),
        uncertain: 0,
      };
    }
    return {
      total: active.reduce((sum,line) => sum + (line.picked ? smartProductPrice(line.picked) * line.count / (line.weighted ? 1000 : 1) : 0),0),
      products: active.filter(line => line.picked).length,
      missing: active.filter(line => !line.picked).length,
      uncertain: active.filter(line => line.uncertain).length,
    };
  }, [lines,group?.kind]);

  const saveList = async () => {
    if (!isPersonalList || !group) return;
    const entries = lines.map(({slot,enabled,picked,count}) =>
      ({slotId:slot.slot_id,checked:enabled,productId:picked?.id,packs:count}));
    setSaving(true);
    try {
      localStorage.setItem(savedKey, JSON.stringify(entries));
      if (user?.id) {
        const { error } = await shoppingDb.from('customer_smart_lists').upsert({
          user_id:user.id,list_key:slug,entries,updated_at:new Date().toISOString(),
        }, { onConflict:'user_id,list_key' });
        if (error) throw error;
      }
      toast({title:'حفظنا نواقص البيت'});
    } catch {
      toast({title:'معرفناش نحفظ القائمة',variant:'destructive'});
    } finally {setSaving(false);}
  };

  const changeMix = (slotId: string, product: Product, delta: number, target: number) => {
    if (!availableSmartProduct(product)) return;
    setMixSelected(current => {
      const groupMix = current[slotId] || {};
      const now = Math.max(0,Number(groupMix[product.id] || 0));
      const total = Object.values(groupMix).reduce((sum,count)=>sum+Math.max(0,count),0);
      const maxStock = Math.max(0,Math.floor(Number(product.quantity || 0)));
      if (delta>0 && (total >= target || now >= maxStock)) return current;
      const next = {...groupMix,[product.id]:Math.max(0,now+delta)};
      if (next[product.id]===0) delete next[product.id];
      return {...current,[slotId]:next};
    });
  };

  const addGroup = async () => {
    if (!isInitialized) return toast({title:'استنى ثانية لحد ما السلة تجهز'});
    if (adding) return;
    const chosen = lines.filter(line => line.enabled);
    if (!chosen.length) return toast({title:'اختار حاجات تضيفها'});
    if (group?.kind==='occasion' && summary.missing>0)
      return toast({title:'كمّل تشكيلتك الأول',description:'اختار المنتجات اللي ناقصة في كل مجموعة.'});
    if (group?.kind!=='occasion' && chosen.some(line => !line.picked))
      return toast({title:'فيه مكونات ناقصة',description:'شيل المكونات اللي مش متوفرة أو استنى لما ترجع.'});
    setAdding(true);
    try {
      // Refresh stock and prices immediately before committing a multi-product
      // cart addition. Stop if the chosen product disappeared or prices changed.
      const fresh = await bundleQuery.refetch();
      if (fresh.error || !fresh.data) throw new Error('REFRESH_FAILED');
      const cartLines: { product:Product; quantity:number; unit_of_measure?:'weight' }[] = [];
      for (const line of chosen) {
        const freshSlot = fresh.data.find(slot => slot.slot_id===line.slot.slot_id);
        if (group?.kind==='occasion') {
          for (const entry of line.chosenMix) {
            const newer = freshSlot?.products.find(product => product.id===entry.product.id);
            if (!newer || !availableSmartProduct(newer) ||
              smartProductPrice(newer)!==smartProductPrice(entry.product) ||
              Number(newer.quantity || 0) < entry.quantity) throw new Error('PRODUCT_CHANGED');
            cartLines.push({product:newer,quantity:entry.quantity});
          }
          continue;
        }
        const newer = freshSlot?.products.find(product => product.id===line.picked?.id);
        if (!newer || !availableSmartProduct(newer) ||
          smartProductPrice(newer)!==smartProductPrice(line.picked!)) throw new Error('PRODUCT_CHANGED');
        cartLines.push({product:newer,quantity:line.count,
          ...(isWeightedProduct(newer) ? {unit_of_measure:'weight' as const} : {})});
      }
      const result = addBundleToCart(cartLines);
      if (result !== 'added') throw new Error('CART_CONFLICT');
      toast({title:'اتضافت طلباتك للسلة'});
      navigate('/cart');
    } catch(e) {
      const code = (e as Error).message;
      toast({
        title: code === 'PRODUCT_CHANGED' ? 'سعر أو توافر منتج اتغير' :
          code === 'CART_CONFLICT' ? 'راجع كميات المنتجات' : 'حصلت مشكلة في تحديث المنتجات',
        description:'راجع الاختيارات وحاول تاني.',
        variant:'destructive',
      });
    } finally {setAdding(false);}
  };

  return (
    <MainLayout hideBottomNav>
      <TopNavBar variant="title" hideSearch hideCart pageTitle={group?.title_ar || 'على مزاجك'}
        showBackButton onBack={() => navigate('/search')} />
      <div className="mx-auto max-w-3xl space-y-4 px-3 pb-32 pt-3 sm:px-5">
        {groupsQuery.isLoading || (branchLoading && Boolean(group)) ? (
          <div className="flex min-h-48 justify-center pt-12"><BrandLoader size="lg" /></div>
        ) : !group ? (
          <div className="rounded-3xl bg-white p-7 text-center">المجموعة دي مش موجودة</div>
        ) : (
          <>
            <div className="rounded-3xl bg-[#e8f5ec] p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-[#005931]">
                  {group.kind === 'recipe' ? <BookOpen size={25} /> : <Users size={25} />}
                </span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-black text-[#005931]">{group.title_ar}</h1>
                  <p className="mt-1 text-sm text-[#386852]">{group.subtitle_ar}</p>
                </div>
              </div>
              {group.kind === 'recipe' && group.source_url?.startsWith('https://') && (
                <a href={group.source_url} target="_blank" rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[#005931] underline underline-offset-4">
                  مصدر الوصفة <ExternalLink size={13}/>
                </a>
              )}
            </div>

            {group.kind !== 'list' && (
              <div className="rounded-3xl bg-white p-4">
                <label className="mb-3 flex items-center gap-2 font-extrabold text-slate-900">
                  <Users size={18} className="text-[#005931]"/>
                  {group.kind === 'recipe' ? 'الأكلة تكفي كام واحد؟' : 'هتتجمعوا كام واحد؟'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2,4,6,8].map(n => (
                    <button key={n} type="button" onClick={() => {setPeople(n);setPacks({});setMixSelected({});}}
                      aria-pressed={people === n}
                      className={`min-h-11 rounded-2xl text-sm font-bold ${people === n ? 'bg-[#005931] text-white' : 'bg-[#f6f8f7] text-slate-700'}`}>
                      {n.toLocaleString('ar-EG')}
                    </button>
                  ))}
                </div>
                {group.kind === 'occasion' && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-bold text-slate-800">القعدة تكون عاملة إزاي؟</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([['simple','على القد'],['medium','مظبوطة'],['large','جامدة']] as const).map(([key,label]) => (
                        <button key={key} type="button" onClick={() => setBudget(key)}
                          aria-pressed={budget===key}
                          className={`min-h-10 rounded-xl text-xs font-bold ${budget===key?'bg-[#005931] text-white':'bg-emerald-50 text-[#005931]'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!branchId ? (
              <button type="button" className="min-h-14 w-full rounded-2xl bg-[#005931] font-bold text-white"
                onClick={() => navigate('/address-manager')}>حدد عنوان التوصيل</button>
            ) : bundleQuery.isLoading || loadingList ? (
              <div className="flex min-h-40 items-center justify-center"><BrandLoader size="md"/></div>
            ) : bundleQuery.isError ? (
              <button type="button" onClick={() => void bundleQuery.refetch()}
                className="min-h-12 w-full rounded-2xl bg-white font-bold text-[#005931]">جرّب تاني</button>
            ) : (
              <>
                <h2 className="px-1 text-lg font-black text-slate-900">اللي هتحتاجه</h2>
                <div className="space-y-2.5">
                  {lines.map(({slot,picked,enabled,count,uncertain,weighted,mixTarget,mixCount,chosenMix}) => {
                    const candidates = slot.products.filter(availableSmartProduct);
                    return group.kind === 'occasion' ? (
                      <section key={slot.slot_id} className="overflow-hidden rounded-[24px] bg-white p-3.5 shadow-[0_4px_14px_rgba(0,50,28,.04)]">
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex min-w-0 items-start gap-2.5">
                            <input type="checkbox" checked={enabled}
                              onChange={e=>setChecked(v=>({...v,[slot.slot_id]:e.target.checked}))}
                              aria-label={`اختيار مجموعة ${slot.label}`}
                              className="mt-1 h-5 w-5 shrink-0 accent-[#005931]" />
                            <span>
                              <span className="block text-base font-black text-slate-900">{slot.label}</span>
                              <span className="block text-xs text-slate-500">{slot.optional?'اختياري':'اختار اللي يعجبك'}</span>
                            </span>
                          </label>
                          {enabled && <span className="shrink-0 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-black text-[#005931]" dir="ltr">
                            {mixCount}/{mixTarget}
                          </span>}
                        </div>
                        {enabled && (
                          <>
                            <div className="mt-3 flex gap-1" dir="ltr" role="progressbar"
                              aria-label={`تشكيلة ${slot.label}`} aria-valuenow={mixCount}
                              aria-valuemin={0} aria-valuemax={mixTarget}>
                              {Array.from({length:Math.min(mixTarget,12)}).map((_,i)=>(
                                <span key={i} className={`h-1.5 flex-1 rounded-full ${i<mixCount?'bg-[#005931]':'bg-slate-200'}`}/>
                              ))}
                            </div>
                            {candidates.length ? (
                              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                                {candidates.map(product=>(
                                  <SmartProductChoiceCard key={product.id} product={product}
                                    quantity={mixSelected[slot.slot_id]?.[product.id] || 0}
                                    maxQuantity={mixTarget}
                                    onChangeQuantity={delta=>changeMix(slot.slot_id,product,delta,mixTarget)}
                                  />
                                ))}
                              </div>
                            ) : <p className="mt-3 text-sm text-rose-600">مفيش منتجات متاحة دلوقتي</p>}
                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className={mixCount===mixTarget?'font-bold text-[#005931]':'text-slate-500'}>
                                {mixCount===mixTarget ? 'تشكيلتك جاهزة ✓' :
                                  `اختار ${Math.max(0,mixTarget-mixCount).toLocaleString('ar-EG')} كمان`}
                              </span>
                              <strong className="text-[#005931]">
                                {moneyEGP(chosenMix.reduce((t,item)=>t+smartProductPrice(item.product)*item.quantity,0))} ج
                              </strong>
                            </div>
                          </>
                        )}
                      </section>
                    ) : (
                      <div key={slot.slot_id} className="rounded-2xl bg-white p-3">
                        <div className="flex items-start gap-3">
                          <input type="checkbox" checked={enabled}
                            onChange={e => setChecked(current => ({...current,[slot.slot_id]:e.target.checked}))}
                            aria-label={`إضافة ${slot.label}`} className="mt-4 h-5 w-5 accent-[#005931]" />
                          <div className="flex h-[83px] w-[83px] shrink-0 items-center justify-center rounded-xl bg-[#f6f8f7]">
                            {picked?.image_urls?.[0] ? (
                              <img src={picked.image_urls[0]} alt={picked.name}
                                loading="lazy" decoding="async"
                                className="smart-product-cutout h-full w-full object-contain p-2"
                              />
                            ) : <ShoppingBag size={24} className="text-[#9aafa2]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <h3 className="truncate text-sm font-extrabold text-slate-900">{slot.label}</h3>
                              {slot.optional && <span className="text-[10px] text-slate-400">اختياري</span>}
                            </div>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {quantityText(slot.amount * people / (group.base_servings || 4),slot.unit)}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-700">
                              {picked ? picked.name : 'مش متوفر في الفرع'}
                            </p>
                            {picked && <p className="mt-1 font-black text-[#005931]">
                              {moneyEGP(smartProductPrice(picked) * count / (weighted ? 1000 : 1))} ج
                            </p>}
                          </div>
                        </div>
                        {enabled && picked && (
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                            <button type="button"
                              onClick={() => setPickerSlot(slot.slot_id)}
                              className="flex min-h-10 min-w-[126px] flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-[#f6f8f7] px-3 text-xs font-bold text-[#005931]">
                              <Images size={16} aria-hidden="true" />
                              {candidates.length>1?'شوف البدائل':'شوف المنتج'}
                            </button>
                            <SmartAlternativesDialog
                              open={pickerSlot===slot.slot_id}
                              onOpenChange={open=>setPickerSlot(open?slot.slot_id:null)}
                              ingredient={slot.label}
                              products={candidates}
                              currentId={picked.id}
                              onPick={product=>{
                                setSelected(v=>({...v,[slot.slot_id]:product.id}));
                                setPacks(v=>{const next={...v};delete next[slot.slot_id];return next;});
                              }}
                            />
                            <div className="flex items-center rounded-xl bg-[#f6f8f7]">
                              <button type="button" aria-label={`تقليل كمية ${slot.label}`}
                                onClick={() => setPacks(v => ({...v,[slot.slot_id]:Math.max(weighted ? 1 : 1,count-(weighted && picked ? productWeightStepGrams(picked) : 1))}))}
                                className="flex h-10 w-9 items-center justify-center text-[#005931]"><Minus size={17}/></button>
                              <span className="min-w-8 px-1 text-center text-xs font-bold">{count.toLocaleString('ar-EG')}{weighted?'جم':''}</span>
                              <button type="button" aria-label={`زيادة كمية ${slot.label}`}
                                onClick={() => setPacks(v => ({...v,[slot.slot_id]:Math.min(weighted?100000:30,count+(weighted && picked ? productWeightStepGrams(picked) : 1))}))}
                                className="flex h-10 w-9 items-center justify-center text-[#005931]"><Plus size={17}/></button>
                            </div>
                          </div>
                        )}
                        {enabled && uncertain && picked && slot.unit !== 'pack' &&
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700">
                            <CircleHelp size={13} /> راجع حجم العبوة قبل الإضافة
                          </p>}
                        {enabled && !picked &&
                          <p className="mt-2 text-xs font-semibold text-rose-600">مش موجود حاليًا — شيله من الاختيارات</p>}
                      </div>
                    );
                  })}
                </div>

                {group.kind === 'list' && (
                  <button type="button" onClick={() => void saveList()} disabled={saving}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#005931] bg-white text-sm font-bold text-[#005931]">
                    <Save size={17}/>{saving?'بنحفظ…':'احفظ نواقص البيت'}
                  </button>
                )}
                <div className="sticky bottom-3 z-30 rounded-2xl border border-emerald-100 bg-white/95 p-3 shadow-lg">
                  <div className="mb-2 flex items-center justify-between">
                    <div><p className="text-xs text-slate-500">{summary.products} منتجات</p>
                    <p className="text-xs text-slate-500">{summary.missing ? group.kind==='occasion' ? `${summary.missing} اختيار ناقص` : `${summary.missing} مش متوفر` : ''}</p></div>
                    <span className="text-xl font-black text-[#005931]">{moneyEGP(summary.total)} ج</span>
                  </div>
                  <button type="button" onClick={() => void addGroup()}
                    disabled={adding || !isInitialized || summary.products === 0 || summary.missing > 0}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#005931] font-black text-white disabled:opacity-50">
                    {adding ? <BrandLoader size="sm" /> : <ShoppingBag size={19}/>}
                    {adding?'بنراجع التوفر…':'ضيف الطلبات للسلة'}
                  </button>
                  {summary.uncertain > 0 && <p className="mt-1 text-center text-[11px] text-slate-500">
                    راجع أحجام العبوات والكميات قبل الإضافة
                  </p>}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
