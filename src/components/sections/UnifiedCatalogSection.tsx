import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/lib/supabase';
import { useBranch } from '@/contexts/BranchContext';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import { Button } from '@/components/ui/button';
export default function UnifiedCatalogSection(){
 const {branch,branchLoading}=useBranch(),[limit,setLimit]=useState(24);
 const catalog=useQuery({queryKey:['unified-home-catalog',branch?.delivery_branch_id],queryFn:()=>getProducts(),enabled:!!branch?.delivery_branch_id,staleTime:15000,refetchOnWindowFocus:true});
 if(!branchLoading&&!branch)return null;
 return <section className="mt-6 rounded-[28px] border border-emerald-100 bg-white p-4 shadow-[0_4px_20px_rgba(0,50,28,0.04)] sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-black">اختياراتك اليومية</h2><p className="mt-1 text-xs text-slate-500">منتجات متنوعة جاهزة لطلبك</p></div><Link to="/search" className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-primary">بحث ←</Link></div>
 {catalog.isLoading||branchLoading?<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({length:6}).map((_,i)=><ProductCardSkeleton key={i}/>)}</div>:catalog.isError?<div className="text-center"><p className="text-sm text-slate-500">تعذر تحميل المنتجات</p><Button variant="outline" onClick={()=>catalog.refetch()}>إعادة المحاولة</Button></div>:<><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{catalog.data?.slice(0,limit).map(p=><ProductCard key={p.id} product={p}/>)}</div>{(catalog.data?.length||0)>limit&&<Button variant="outline" className="mx-auto mt-5 block" onClick={()=>setLimit(v=>v+24)}>عرض منتجات أكثر</Button>}</>}
 </section>;
}
