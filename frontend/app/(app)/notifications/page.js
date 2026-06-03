'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Spinner, EmptyState, StatusBadge } from '@/components/ui';

export default function NotificationsPage() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('all'); // all | unread

  const load = useCallback(async () => {
    const res = await api.get(`/notifications${filter === 'unread' ? '?unread=true' : ''}`);
    setData(res);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id) { await api.patch(`/notifications/${id}/read`); load(); }
  async function markAll() { await api.post('/notifications/read-all'); load(); }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted">{data ? `${data.unread} unread` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700">
            {['all', 'unread'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm capitalize ${filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                {f}
              </button>
            ))}
          </div>
          <button className="btn-secondary" onClick={markAll}>Mark all read</button>
        </div>
      </div>

      {!data ? <Spinner /> : data.notifications.length === 0 ? (
        <div className="card"><EmptyState>No notifications.</EmptyState></div>
      ) : (
        <div className="space-y-2">
          {data.notifications.map((n) => (
            <div key={n.id} className={`card flex items-start justify-between gap-4 p-4 ${n.isRead ? '' : 'border-l-4 border-l-brand-600'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{n.title}</span>
                  <StatusBadge value={n.type} />
                </div>
                <p className="mt-1 text-sm text-muted">{n.message}</p>
                <p className="mt-1 text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <button className="btn-ghost px-2 py-1 text-xs text-brand-600" onClick={() => markRead(n.id)}>Mark read</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
