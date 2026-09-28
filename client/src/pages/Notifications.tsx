import { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Check,
  MessageSquare,
  DoorOpen,
  Calendar,
  CreditCard,
  Info,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { useToast } from '@/hooks/useToast';
import { notificationService } from '@/services/notificationService';
import type { Notification, PaginatedResult } from '@/types';

export function Notifications() {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResult<Notification> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications({
        page,
        limit: 15,
      });
      setData(res);
    } catch (err: any) {
      toast({
        title: 'Error loading notifications',
        description: err.response?.data?.message || 'Could not fetch notifications',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        };
      });
    } catch (err: any) {
      toast({
        title: 'Error updating notification',
        type: 'error',
      });
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      toast({ title: 'All notifications marked as read', type: 'success' });
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((n) => ({ ...n, is_read: true })),
        };
      });
    } catch (err: any) {
      toast({
        title: 'Error updating notifications',
        type: 'error',
      });
    } finally {
      setMarkingAll(false);
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('COMPLAINT')) {
      return <MessageSquare size={16} className="text-indigo-400" />;
    }
    if (type.includes('LEAVE') || type.includes('GATE_PASS')) {
      return <DoorOpen size={16} className="text-emerald-400" />;
    }
    if (type.includes('VISITOR')) {
      return <Calendar size={16} className="text-amber-400" />;
    }
    if (type.includes('FEE')) {
      return <CreditCard size={16} className="text-purple-400" />;
    }
    return <Info size={16} className="text-blue-400" />;
  };

  const unreadCount = data?.items.filter((n) => !n.is_read).length || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated with complaints, approvals, visitors, and facility alerts"
        actions={
          unreadCount > 0 ? (
            <Button
              variant="secondary"
              onClick={handleMarkAllRead}
              loading={markingAll}
              className="flex items-center gap-2 text-xs"
            >
              <CheckCheck size={14} />
              Mark All as Read
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingState text="Loading notifications..." />
        </div>
      ) : data?.items.length === 0 ? (
        <Card className="p-12 text-center bg-slate-950 border border-slate-800">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500 mb-3">
            <Bell size={20} />
          </div>
          <h3 className="text-base font-semibold text-slate-200">No Notifications</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You're all caught up! Updates regarding complaints, leaves, and visitors will appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data?.items.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 transition-all duration-200 ${
                !notification.is_read
                  ? 'bg-slate-900/90 border-l-4 border-l-indigo-500 border-slate-800 shadow-md'
                  : 'bg-slate-950/70 border-slate-800/80 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getTypeIcon(notification.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-100">
                        {notification.title}
                      </h4>
                      {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {notification.message}
                    </p>
                    <span className="text-[11px] text-slate-500 block pt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!notification.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="text-xs text-slate-400 hover:text-slate-200 shrink-0"
                    title="Mark as read"
                  >
                    <Check size={14} className="mr-1" />
                    Read
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {data && data.totalPages > 1 && (
            <div className="pt-4 flex justify-center">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
