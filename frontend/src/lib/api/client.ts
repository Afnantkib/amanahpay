import type { CustomerRow, DashboardSummary, MockPlan } from './types';
const base = import.meta.env.VITE_API_URL || '';
let accessToken: string | null = typeof window !== 'undefined' ? (sessionStorage.getItem('amanah_token') || localStorage.getItem('amanah_token')) : null;
let customerToken: string | null = typeof window !== 'undefined' ? (sessionStorage.getItem('amanah_customer_token') || localStorage.getItem('amanah_customer_token')) : null;
let refreshInFlight: Promise<boolean> | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('amanah_token', token);
    else { localStorage.removeItem('amanah_token'); sessionStorage.removeItem('amanah_token'); }
  }
}
export function setCustomerToken(token: string | null) {
  customerToken = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('amanah_customer_token', token);
    else { localStorage.removeItem('amanah_customer_token'); sessionStorage.removeItem('amanah_customer_token'); }
  }
}
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).amanahSetToken = setAccessToken;
  (window as unknown as Record<string, unknown>).amanahSetCustomerToken = setCustomerToken;
}
async function refresh(): Promise<boolean> {
  if (!refreshInFlight) refreshInFlight = fetch(`${base}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' }).then(async r => { if (!r.ok) return false; const data = await r.json(); setAccessToken(data.accessToken); return true; }).catch(() => false).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const response = await fetch(`${base}/api${path}`, { ...init, credentials: 'include', headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers } });
  if (response.status === 401 && !retried && await refresh()) return request<T>(path, init, true);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}
export const authApi = {
  signup: (email: string, businessName: string) => request<{ message: string }>('/v1/auth/signup/request', { method: 'POST', body: JSON.stringify({ email, businessName }) }),
  requestLogin: (email: string) => request<{ message: string }>('/v1/auth/login/request', { method: 'POST', body: JSON.stringify({ email }) }),
  verify: async (email: string, code: string, purpose: 'LOGIN' | 'SIGNUP') => { const data = await request<{ accessToken: string; expiresIn: number; user: unknown }>('/v1/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email, code, purpose }) }); setAccessToken(data.accessToken); return data; },
  logout: async () => { try { await request('/v1/auth/logout', { method: 'POST' }); } finally { setAccessToken(null); } },
  logoutAll: async () => { try { await request('/v1/auth/logout-all', { method: 'POST' }); } finally { setAccessToken(null); } },
  me: () => request('/v1/auth/me'),
};
async function customerRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/customer${path}`, { ...init, signal: controller.signal, credentials: 'include', headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(customerToken ? { Authorization: `Bearer ${customerToken}` } : {}), ...init.headers } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('The request timed out. Check that the service is running, then try again.');
    throw new Error('Could not reach Amanah Pay. Check that the service is running, then try again.');
  } finally { window.clearTimeout(timeout); }
  if (!response.ok) {
    let message = response.status === 429
      ? (path.includes('/verify')
          ? 'Too many verification attempts. Please wait before trying again.'
          : 'Too many code requests. Please wait up to an hour before requesting another code.')
      : `Request failed (${response.status})`;
    try {
      const data = await response.json();
      message = data.detail || data.message || data.title || message;
    } catch { /* Keep the status-specific fallback when the response has no JSON body. */ }
    throw new Error(message);
  }
  const type = response.headers.get('content-type') || '';
  return (type.includes('application/json') ? response.json() : response.blob()) as Promise<T>;
}
export const customerApi = {
  hasCustomerSession: () => Boolean(customerToken),
  signupRequest: (fullName: string, email: string) => customerRequest<{ message: string; email: string }>('/auth/signup/request', { method: 'POST', body: JSON.stringify({ fullName, email }) }),
  verifySignup: async (email: string, code: string) => { const data = await customerRequest<{ accessToken: string; expiresIn: number; account: { id: number; fullName: string; email: string } }>('/auth/signup/verify', { method: 'POST', body: JSON.stringify({ email, code }) }); setCustomerToken(data.accessToken); return data; },
  requestLogin: (email: string) => customerRequest<{ message: string; email: string }>('/auth/login/request', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyLogin: async (email: string, code: string, fullName?: string) => { const data = await customerRequest<{ accessToken: string; expiresIn: number; account: { id: number; fullName: string; email: string } }>('/auth/login/verify', { method: 'POST', body: JSON.stringify({ email, code, fullName }) }); setCustomerToken(data.accessToken); return data; },
  accountPlans: () => customerRequest<CustomerOffer[]>('/account/plans'),
  accountOffer: (token: string) => customerRequest<CustomerOffer>(`/account/offers/${encodeURIComponent(token)}`),
  acceptAccountPlan: (planId: number) => customerRequest<{ status: string; plan: CustomerOffer }>(`/account/plans/${planId}/accept`, { method: 'POST' }),
  reportAccountPayment: (planId: number, note: string) => customerRequest<{ status: string; message: string }>(`/account/plans/${planId}/payment-report`, { method: 'POST', body: JSON.stringify({ note }) }),
  accountAgreement: (planId: number) => customerRequest<Blob>(`/account/plans/${planId}/agreement`),
  logout: () => { setCustomerToken(null); },
  requestOtp: (token: string) => { setCustomerToken(null); return customerRequest<{ message: string; email: string }>(`/link/${encodeURIComponent(token)}/otp/request`, { method: 'POST' }); },
  verify: async (token: string, code: string) => { const data = await customerRequest<{ accessToken: string; expiresIn: number; plan: CustomerOffer }>('/otp/verify', { method: 'POST', body: JSON.stringify({ token, code }) }); setCustomerToken(data.accessToken); return data; },
  plan: () => customerRequest<CustomerOffer>('/plan'),
  accept: () => customerRequest<{ status: string; agreement: string; plan: CustomerOffer }>('/plan/accept', { method: 'POST' }),
  reportPayment: (note: string) => customerRequest<{ status: string; message: string }>('/plan/payment-report', { method: 'POST', body: JSON.stringify({ note }) }),
  agreement: () => customerRequest<Blob>('/plan/agreement'),
};
export interface CustomerOffer {
  id: number;
  status: string;
  itemName: string;
  merchantName: string;
  totalPricePaise: number;
  downPaymentPaise: number;
  installmentCount: number;
  installments: Array<{ id: number; amount_paise: number; status: string; dueDate: string }>;
  upiLink: string;
  upiId?: string;
  nextDuePaise?: number;
  agreement?: string;
}
export interface CreatedOffer {
  id: number;
  customerId: number;
  itemName: string;
  totalPricePaise: number;
  downPaymentPaise: number;
  installmentCount: number;
  firstDueDate: string;
  shareUrl: string;
  expiresAt: string;
}
export interface PaymentRecord {
  id: number;
  planId: number;
  installmentId?: number | null;
  amountPaise: number;
  status: 'REPORTED' | 'PAID';
  paymentMethod: 'UPI' | 'BANK_TRANSFER' | 'CASH';
  reference: string;
  date: string;
  confirmedAt?: string | null;
  itemName: string;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
}
export interface PlanInstallment {
  id: number;
  planId: number;
  status: string;
  amountPaise: number;
  dueDate: string;
  paidAt?: string | null;
}
export interface MonthlyCashflow {
  month: string;
  monthLabel: string;
  collectedPaise: number;
  pendingPaise: number;
  collected: number;
  pending: number;
}
export interface ReportsSummary {
  collectedPaise: number;
  paymentCount: number;
  pendingPaise: number;
  pendingPlansCount: number;
  overduePaise: number;
  overdueCustomersCount: number;
  activePlansCount: number;
  completedPlansCount: number;
  completionRate: number;
}
export interface MerchantSettings {
  businessName: string;
  upiId: string;
  contactPhone: string;
  remindDaysBefore?: number;
  acceptedPaymentMethods?: string;
  defaultLanguage?: string;
}
export const api = {
  dashboard: () => request<DashboardSummary>('/dashboard'),
  customers: () => request<CustomerRow[]>('/customers'),
  plans: () => request<MockPlan[]>('/plans'),
  payments: () => request<PaymentRecord[]>('/v1/payments'),
  planInstallments: (planId: number | string) => request<PlanInstallment[]>(`/v1/plans/${planId}/installments`),
  markInstallmentPaid: (
    planId: number | string,
    installmentId: number | string,
    data: { amountPaise: number; paymentMethod: string; reference?: string; notes?: string }
  ) =>
    request<{ success: boolean; message: string; planStatus: string }>(
      `/v1/plans/${planId}/installments/${installmentId}/pay`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
  confirmPayment: (paymentId: number) =>
    request<{ success: boolean; status: string }>(`/v1/payments/${paymentId}/confirm`, { method: 'POST' }),
  sendReminder: (planId: number | string, installmentId: number | string) =>
    request<{ success: boolean; message: string }>(`/v1/plans/${planId}/installments/${installmentId}/remind`, {
      method: 'POST',
    }),
  createCustomer: (customer: { fullName: string; email?: string; phone?: string }) =>
    request<{ id: string; name: string; email: string; phone: string }>('/v1/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    }),
  reportsMonthly: () => request<MonthlyCashflow[]>('/v1/reports/monthly'),
  reportsSummary: () => request<ReportsSummary>('/v1/reports/summary'),
  createOffer: (offer: {
    customerName: string;
    customerEmail: string;
    phone?: string;
    itemName: string;
    totalPricePaise: number;
    downPaymentPaise: number;
    installmentCount: number;
    firstDueDate: string;
  }) => request<CreatedOffer>('/v1/plans', { method: 'POST', body: JSON.stringify(offer) }),
  merchantSettings: () => request<MerchantSettings>('/v1/merchant/settings'),
  saveMerchantSettings: (settings: MerchantSettings) =>
    request<MerchantSettings>('/v1/merchant/settings', { method: 'PUT', body: JSON.stringify(settings) }),
};

