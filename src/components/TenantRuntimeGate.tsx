import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ShoppingBag, ShieldAlert } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { fetchPublicTenantRuntime } from '@/lib/tenantRuntime';

const blockedOnlineRoutes = ['/cart', '/payment', '/marketplace-payment'];

function FullBlock({ message, retry, loading }: { message: string; retry: () => void; loading: boolean }) {
  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-black text-gray-950">الخدمة متوقفة مؤقتًا</h1>
        <p className="mt-3 text-sm leading-7 text-gray-600">{message}</p>
        <Button variant="outline" className="mt-6" onClick={retry} disabled={loading}>
          <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          إعادة المحاولة
        </Button>
      </div>
    </div>
  );
}

export default function TenantRuntimeGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['customer-tenant-runtime'],
    queryFn: fetchPublicTenantRuntime,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  if (query.isLoading) {
    return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gray-50 text-sm font-bold text-gray-500">جاري التحقق من حالة الخدمة...</div>;
  }

  if (query.isError || !query.data) {
    return (
      <FullBlock
        message="تعذر التحقق من حالة الخدمة حاليًا. تأكد من اتصال الإنترنت وحاول مرة أخرى."
        retry={() => void query.refetch()}
        loading={query.isFetching}
      />
    );
  }

  const runtime = query.data;
  const platformMessage = runtime.block_message_ar || 'الخدمة متوقفة مؤقتًا بواسطة إدارة المنصة. حاول مرة أخرى لاحقًا.';

  if (!runtime.app_access_enabled || !runtime.customer_app_enabled) {
    return <FullBlock message={platformMessage} retry={() => void query.refetch()} loading={query.isFetching} />;
  }

  const onlineBlocked = !runtime.online_sales_enabled;
  const transactionalRoute = blockedOnlineRoutes.some(path => location.pathname === path || location.pathname.startsWith(`${path}/`));

  if (onlineBlocked && transactionalRoute) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
        <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-xl font-black text-gray-950">الطلبات الأونلاين متوقفة مؤقتًا</h1>
          <p className="mt-3 text-sm leading-7 text-gray-600">{platformMessage}</p>
          <Button className="mt-6" onClick={() => navigate('/', { replace: true })}>العودة للتصفح</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {onlineBlocked && (
        <div dir="rtl" className="sticky top-0 z-[100] border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-900">
          الطلبات الأونلاين متوقفة مؤقتًا — التصفح متاح فقط.
        </div>
      )}
      {children}
    </>
  );
}
