'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { partnersApi } from '@/lib/api-client';
import { formatRupees } from '@/lib/format';

export default function RiderPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!token || user?.role !== 'rider') {
      router.push('/');
    }
  }, [token, user, router]);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['rider-tasks'],
    queryFn: () => partnersApi.getRiderTasks(token!),
    refetchInterval: 15000,
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: (orderId: string) => partnersApi.acceptReassignment(orderId, token!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rider-tasks'] }),
  });

  if (!token || user?.role !== 'rider') return null;

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--bg)' }}>
      <div className="card rounded-none px-4 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-title">🛵 Rider App</h1>
            <p className="text-meta">{user?.name}</p>
          </div>
          <button id="rider-logout-btn" onClick={() => { useAuthStore.getState().clearAuth(); router.push('/'); }} className="btn-ghost" style={{ width: 'auto' }}>
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <h2 className="text-title">Your deliveries</h2>
        {isLoading && <p className="text-body" style={{ color: 'var(--ink-2)' }}>Loading…</p>}
        {!isLoading && (tasks as any[]).length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-2">🛵</p>
            <p className="text-title">No active tasks</p>
          </div>
        )}
        {(tasks as any[]).map((task: any) => (
          <div key={task.id} className="card p-5 step-enter">
            <div className="flex items-center justify-between mb-3">
              <p className="text-body font-semibold">From {task.restaurant?.name}</p>
              <span className="text-meta px-2 py-1 rounded-pill" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                {task.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-body mb-1">{task.items?.length ?? 0} items · {formatRupees(task.totalPaise)}</p>
            <p className="text-meta mb-4">{task.address}</p>

            {task.status === 'rider_assigned' && (
              <button
                id={`accept-reassignment-${task.id}`}
                onClick={() => acceptMutation.mutate(task.id)}
                disabled={acceptMutation.isPending}
                className="btn-primary"
              >
                Accept delivery
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
