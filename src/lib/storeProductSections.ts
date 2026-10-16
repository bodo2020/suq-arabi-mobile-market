import type { Product,MainCategory,Subcategory } from './supabase';
export function storeProductSections<T extends Product>(products:T[],categories:MainCategory[],subcategories:Subcategory[]){
 const groups=new Map<string,{id:string;name:string;position:number;sections:{id:string;name:string;image?:string|null;position:number;products:T[]}[]}>();
 for(const product of products){
  const main=categories.find(c=>c.id===product.main_category_id),mainId=product.main_category_id||'other';
  let group=groups.get(mainId);
  if(!group){group={id:mainId,name:main?.name||'منتجات أخرى',position:categories.findIndex(c=>c.id===mainId),sections:[]};groups.set(mainId,group);}
  const sub=subcategories.find(c=>c.id===product.subcategory_id&&c.category_id===mainId);
  const id=mainId+':'+(sub?.id||'other');
  let section=group.sections.find(s=>s.id===id);
  if(!section){section={id,name:sub?.name||'منتجات أخرى',image:sub?.image_url,position:sub?subcategories.findIndex(c=>c.id===sub.id):-1,products:[]};group.sections.push(section);}
  section.products.push(product);
 }
 const rank=(position:number)=>position<0?Number.MAX_SAFE_INTEGER:position;
 return [...groups.values()].sort((a,b)=>rank(a.position)-rank(b.position)).map(group=>({...group,sections:group.sections.sort((a,b)=>rank(a.position)-rank(b.position))}));
}
