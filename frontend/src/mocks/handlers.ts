import { http, HttpResponse } from 'msw';
import type { CustomerRow, DashboardSummary, MockPlan } from '../lib/api/types';
const customers: CustomerRow[] = [
  {
    id: 'c1',
    name: 'Ayesha Khan',
    phone: '+91 98765 43210',
    activePlans: 2,
    paidPaise: 4800000,
    pendingPaise: 800000,
    nextDue: '2026-11-08',
    status: 'On track',
  },
  {
    id: 'c2',
    name: 'Rahul Mehta',
    phone: '+91 98111 22334',
    activePlans: 1,
    paidPaise: 1600000,
    pendingPaise: 800000,
    nextDue: '2026-11-02',
    status: 'Due soon',
  },
  {
    id: 'c3',
    name: 'Sara Ahmed',
    phone: '+91 98989 00011',
    activePlans: 1,
    paidPaise: 800000,
    pendingPaise: 2400000,
    nextDue: '2026-10-25',
    status: 'Overdue',
  },
  {
    id: 'c4',
    name: 'Vikram Shah',
    phone: '+91 99887 76655',
    activePlans: 3,
    paidPaise: 7200000,
    pendingPaise: 1200000,
    nextDue: '2026-11-12',
    status: 'On track',
  },
];
const summary: DashboardSummary = {
  collectedPaise: 12450000,
  pendingPaise: 8630000,
  overduePaise: 2140000,
  upcomingPaise: 1820000,
  dueToday: [
    {
      id: 'p1',
      customer: 'Rahul Mehta',
      item: 'Dining table set',
      amountPaise: 800000,
      due: '2026-10-31',
      status: 'Due soon',
    },
    {
      id: 'p2',
      customer: 'Sara Ahmed',
      item: 'Laptop',
      amountPaise: 400000,
      due: '2026-10-31',
      status: 'Overdue',
    },
  ],
};
const plans: MockPlan[] = customers.map((c, i) => ({
  id: `p-${i + 1}`,
  customer: c.name,
  item: ['Dining table set', 'Phone', 'Laptop', 'Home appliance'][i],
  totalPaise: c.paidPaise + c.pendingPaise,
  monthlyPaise: 800000,
  remainingPaise: c.pendingPaise,
  status: c.status,
  nextDue: c.nextDue,
}));
export const handlers = [
  http.get('/api/dashboard', () => HttpResponse.json(summary)),
  http.get('/api/customers', () => HttpResponse.json(customers)),
  http.get('/api/plans', () => HttpResponse.json(plans)),
  http.get('/api/v1/payments', () =>
    HttpResponse.json([
      {
        id: 1,
        planId: 1,
        installmentId: 1,
        amountPaise: 1500000,
        status: 'PAID',
        paymentMethod: 'UPI',
        reference: 'UPI-REF-884920',
        date: '2026-11-01 12:30',
        itemName: 'MacBook Air M3',
        customerId: 1,
        customerName: 'Ayesha Khan',
        customerPhone: '+91 98765 43210',
      },
    ])
  ),
  http.get('/api/v1/reports/monthly', () =>
    HttpResponse.json([
      { month: '2026-06', monthLabel: 'Jun', collectedPaise: 4800000, pendingPaise: 2400000, collected: 48, pending: 24 },
      { month: '2026-07', monthLabel: 'Jul', collectedPaise: 5600000, pendingPaise: 3100000, collected: 56, pending: 31 },
      { month: '2026-08', monthLabel: 'Aug', collectedPaise: 4200000, pendingPaise: 3700000, collected: 42, pending: 37 },
      { month: '2026-09', monthLabel: 'Sep', collectedPaise: 7200000, pendingPaise: 3600000, collected: 72, pending: 36 },
      { month: '2026-10', monthLabel: 'Oct', collectedPaise: 6400000, pendingPaise: 4200000, collected: 64, pending: 42 },
    ])
  ),
  http.get('/api/v1/reports/summary', () =>
    HttpResponse.json({
      collectedPaise: 12450000,
      paymentCount: 42,
      pendingPaise: 8630000,
      pendingPlansCount: 19,
      overduePaise: 2140000,
      overdueCustomersCount: 7,
      activePlansCount: 12,
      completedPlansCount: 8,
      completionRate: 76,
    })
  ),
  http.get('/api/v1/merchant/settings', () =>
    HttpResponse.json({
      businessName: 'Noor Electronics',
      upiId: 'noor@icici',
      contactPhone: '+91 98765 00000',
      remindDaysBefore: 3,
      acceptedPaymentMethods: 'UPI,BANK_TRANSFER,CASH',
      defaultLanguage: 'en',
    })
  ),
];

