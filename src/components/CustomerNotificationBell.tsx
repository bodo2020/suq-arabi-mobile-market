import React from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import {
  fetchCustomerNotificationCenterV2,
  type CustomerNotificationItemV2,
} from '@/services/notificationCenterV2';

const CustomerNotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const unread = useQuery({
    queryKey: ['customer-notification-unread', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchCustomerNotificationCenterV2('unread'),
    staleTime: 8_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  if (!user) return null;

  const count = unread.data?.summary.unread || 0;
  const latest: CustomerNotificationItemV2 | undefined = unread.data?.items?.[0];

  return (
    <button
      type="button"
      onClick={() => navigate('/notifications')}
      title={latest?.title || 'الإشعارات'}
      aria-label={count ? `الإشعارات، ${count} غير مقروء` : 'الإشعارات'}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#005931] transition hover:bg-green-50 active:scale-95"
    >
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute -left-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
};

export default React.memo(CustomerNotificationBell);
