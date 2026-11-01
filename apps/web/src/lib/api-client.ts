/**
 * api-client.ts — typed API client for all REST calls.
 * Used with TanStack Query — never called directly from components.
 */

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { message?: string }).message ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  requestOtp: (phone: string) =>
    request('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOtp: (phone: string, otp: string) =>
    request<{ accessToken: string; user: { id: string; role: string; name: string } }>(
      '/auth/otp/verify',
      { method: 'POST', body: JSON.stringify({ phone, otp }) },
    ),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  getMyOrder: (token: string) =>
    request<any>('/orders/me', { token }),

  getAllOrders: (token: string) =>
    request<any[]>('/orders/all', { token }),

  getCompletedOrders: (token: string) =>
    request<any[]>('/orders/completed', { token }),

  getCustomerRecoveryHistory: (token: string) =>
    request<any[]>('/orders/recovery/history', { token }),

  getOrder: (id: string, token: string) =>
    request<any>(`/orders/${id}`, { token }),
};

// ── Health ────────────────────────────────────────────────────────────────────
export const healthApi = {
  getHealth: (orderId: string, token: string) =>
    request<any>(`/health/${orderId}`, { token }),
};

// ── Rescue ────────────────────────────────────────────────────────────────────
export const rescueApi = {
  getCase: (orderId: string, token: string) =>
    request<any>(`/rescue/${orderId}`, { token }),

  recordChoice: (caseId: string, choice: string, replacementRestaurantId: string | undefined, token: string) =>
    request<{ ok: boolean }>(`/rescue/${caseId}/choice`, {
      method: 'POST',
      body: JSON.stringify({ choice, replacementRestaurantId }),
      token,
    }),
};

// ── Resolve ───────────────────────────────────────────────────────────────────
export const resolveApi = {
  getMyCases: (token: string) =>
    request<any[]>('/resolve/cases', { token }),

  getCase: (id: string, token: string) =>
    request<any>(`/resolve/cases/${id}`, { token }),

  createCase: (orderId: string, issue: string, token: string) =>
    request<any>('/resolve/cases', {
      method: 'POST',
      body: JSON.stringify({ orderId, issue }),
      token,
    }),

  addEvidence: (caseId: string, formData: FormData, token: string) =>
    fetch(`${API_BASE}/resolve/cases/${caseId}/evidence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then((r) => r.json()),

  previewDecision: (caseId: string, token: string) =>
    request<any>(`/resolve/cases/${caseId}/preview`, { token }),

  submitCase: (caseId: string, token: string) =>
    request<any>(`/resolve/cases/${caseId}/submit`, { method: 'POST', token }),

  acceptCase: (caseId: string, token: string) =>
    request<{ ok: boolean }>(`/resolve/cases/${caseId}/accept`, { method: 'POST', token }),

  escalateCase: (caseId: string, token: string) =>
    request<{ ok: boolean }>(`/resolve/cases/${caseId}/escalate`, { method: 'POST', token }),
};

// ── Agent ─────────────────────────────────────────────────────────────────────
export const agentApi = {
  getCaseQueue: (token: string) =>
    request<any[]>('/agent/cases', { token }),

  getAllCases: (token: string) =>
    request<any[]>('/agent/all-cases', { token }),

  getLedger: (token: string) =>
    request<any[]>('/agent/ledger', { token }),

  getRecoveryLedger: (token: string) =>
    request<any[]>('/agent/ledger', { token }),

  getCasePack: (id: string, token: string) =>
    request<any>(`/agent/cases/${id}`, { token }),

  takeAction: (id: string, payload: object, token: string) =>
    request<{ ok: boolean }>(`/agent/cases/${id}/action`, {
      method: 'POST',
      body: JSON.stringify(payload),
      token,
    }),
};

// ── Partners ──────────────────────────────────────────────────────────────────
export const partnersApi = {
  getRestaurantOrders: (token: string) =>
    request<any[]>('/partner/restaurant/orders', { token }),

  acceptOrder: (orderId: string, token: string) =>
    request<{ ok: boolean; status: string }>(`/partner/restaurant/orders/${orderId}/accept`, {
      method: 'POST',
      token,
    }),

  markReady: (orderId: string, token: string) =>
    request<{ ok: boolean; status: string }>(`/partner/restaurant/orders/${orderId}/mark-ready`, {
      method: 'POST',
      token,
    }),

  confirmPacking: (orderId: string, confirmedMinutes: number, token: string) =>
    request<any>(`/partner/restaurant/orders/${orderId}/confirm-packing`, {
      method: 'POST',
      body: JSON.stringify({ confirmedMinutes }),
      token,
    }),

  getRiderTasks: (token: string) =>
    request<any[]>('/partner/rider/tasks', { token }),

  acceptReassignment: (orderId: string, token: string) =>
    request<{ ok: boolean }>(`/partner/rider/tasks/${orderId}/accept-reassignment`, {
      method: 'POST',
      token,
    }),

  pickupTask: (orderId: string, token: string) =>
    request<{ ok: boolean; status: string }>(`/partner/rider/tasks/${orderId}/pickup`, {
      method: 'POST',
      token,
    }),

  pickupOrder: (orderId: string, token: string) =>
    request<{ ok: boolean; status: string }>(`/partner/rider/tasks/${orderId}/pickup`, {
      method: 'POST',
      token,
    }),

  deliverTask: (orderId: string, token: string) =>
    request<{ ok: boolean; status: string }>(`/partner/rider/tasks/${orderId}/deliver`, {
      method: 'POST',
      token,
    }),

  deliverOrder: (orderId: string, token: string) =>
    request<{ ok: boolean; status: string }>(`/partner/rider/tasks/${orderId}/deliver`, {
      method: 'POST',
      token,
    }),

  reportIssue: (orderId: string, reason: string, token: string) =>
    request<{ ok: boolean; reason: string }>(`/partner/rider/tasks/${orderId}/report-issue`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      token,
    }),

  reportRiderIssue: (orderId: string, reason: string, token: string) =>
    request<{ ok: boolean; reason: string }>(`/partner/rider/tasks/${orderId}/report-issue`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      token,
    }),
};

// ── Simulator ─────────────────────────────────────────────────────────────────
export const simApi = {
  injectFault: (orderId: string, kind: string, token: string) =>
    request<{
      ok: boolean;
      healthState?: any;
      rescueOffered?: boolean;
      rescueCaseId?: string;
      rescueOptions?: any[];
      etaAt?: string;
      message?: string;
    }>(`/sim/${orderId}/fault`, {
      method: 'POST',
      body: JSON.stringify({ kind }),
      token,
    }),

  reset: (token: string) =>
    request<{ ok: boolean }>('/sim/reset', { method: 'POST', token }),
};

export { ApiError };
