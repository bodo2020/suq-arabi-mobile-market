import {useEffect,useMemo,useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {getCategories,getSubcategories} from '@/lib/supabase';
import {DisplayProduct,productCardKey} from '@/lib/productPurchase';
import ProductCard from '@/components/ui/ProductCard';
import SmartImage from '@/components/ui/SmartImage';
import {storeProductSections} from '@/lib/storeProductSections';
import {centerSectionChip} from '@/lib/centerSectionChip';

export default function MainCategoryProductSections({products,level='main'}:{products:DisplayProduct[];level?:'main'|'sub'}){
 const taxonomy=useQuery({queryKey:['categories'],queryFn:getCategories});
 const subcategories=useQuery({queryKey:['subcategories'],queryFn:()=>getSubcategories(),enabled:level==='sub'});
 const groups=useMemo(()=>{
  const sections=storeProductSections(products,taxonomy.data||[],level==='sub'?subcategories.data||[]:[]);
  if(level==='sub')return sections.flatMap(g=>g.sections);
  return sections.map(g=>({...g,image:taxonomy.data?.find(c=>c.id===g.id)?.image_url,products:g.sections.flatMap(s=>s.products)}));
 },[products,taxonomy.data,subcategories.data,level]);
 const [active,setActive]=useState('');const bar=useRef<HTMLDivElement>(null),refs=useRef<Record<string,HTMLElement|null>>({}),chips=useRef<Record<string,HTMLButtonElement|null>>({});
 const strip=useRef<HTMLElement>(null);
 const offset=()=> (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-nav-height'))||68)+(bar.current?.offsetHeight||58)+12;
 useEffect(()=>{
  if(!groups.length){setActive('');return;}let frame=0;
  const update=()=>{frame=0;let id=groups[0].id;for(const g of groups){const node=refs.current[g.id];if(node&&node.getBoundingClientRect().top<=offset())id=g.id;else break;}if(window.scrollY>0&&window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-6)id=groups[groups.length-1].id;setActive(id)};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule)};
 },[groups]);
 useEffect(()=>{const chip=chips.current[active];if(strip.current&&chip)centerSectionChip(strip.current,chip)},[active]);
 const scroll=(id:string)=>{const node=refs.current[id];if(node){setActive(id);window.scrollTo({top:Math.max(0,window.scrollY+node.getBoundingClientRect().top-offset()),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}};
 if(!groups.length)return null;
 return <><div ref={bar} style={{top:'var(--top-nav-height, 68px)'}} className="sticky z-40 mb-5 border-y border-emerald-100 bg-white/95 py-2.5 shadow-sm backdrop-blur-xl"><nav ref={strip} aria-label={level==='sub'?'الأقسام الفرعية':'الأقسام الرئيسية'} className="hide-scrollbar flex flex-nowrap gap-1.5 overflow-x-auto px-1" dir="rtl">{groups.map(g=><button ref={node=>{chips.current[g.id]=node}} key={g.id} type="button" aria-pressed={active===g.id} onClick={()=>scroll(g.id)} className={'flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-bold sm:h-10 sm:text-sm '+(active===g.id?'border-primary bg-primary text-white shadow-md':'border-emerald-100 bg-white text-slate-700')}>{g.image&&<span className="h-5 w-5 overflow-hidden rounded-full bg-white"><SmartImage src={g.image} alt="" className="h-full w-full object-cover"/></span>}<span>{g.name}</span><span className="text-[9px] opacity-70">{g.products.length}</span></button>)}</nav></div><div className="space-y-7">{groups.map(g=><section key={g.id} ref={node=>{refs.current[g.id]=node}} data-main-category={level==='main'?g.id:undefined} data-subcategory={level==='sub'?g.id:undefined} style={{scrollMarginTop:'calc(var(--top-nav-height, 68px) + 74px)'}}><div className="mb-3 flex items-baseline justify-between gap-2"><h2 className="text-base font-black text-slate-950 sm:text-lg">{g.name}</h2><span className="text-xs text-slate-400">{g.products.length} منتج</span></div><div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{g.products.map(p=><ProductCard key={(p.marketplace_listing_id||'owned')+':'+productCardKey(p)} product={p}/>)}</div></section>)}</div></>;
}
