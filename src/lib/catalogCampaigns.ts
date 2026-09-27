import { supabase } from '@/integrations/supabase/client';
export type CatalogCampaign={id:string;title:string;description:string;kind:'offer'|'flash';product_ids:string[];starts_at:string;ends_at:string;active:boolean};
export async function getCatalogCampaigns():Promise<CatalogCampaign[]> {
 const {data,error}=await (supabase as any).from('catalog_campaigns').select('id,title,description,kind,product_ids,starts_at,ends_at,active').eq('active',true).gt('ends_at',new Date().toISOString()).order('starts_at').limit(100);
 if(error)throw error;
 return data||[];
}
export const campaignState=(campaign:CatalogCampaign,now=Date.now()) => now<new Date(campaign.starts_at).getTime()?'upcoming':now>=new Date(campaign.ends_at).getTime()?'ended':'live';
export const countdown=(target:string,now:number) => {
 const seconds=Math.max(0,Math.floor((new Date(target).getTime()-now)/1000));
 const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60);
 return (days?days+' يوم · ':'')+[hours,minutes,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
};

