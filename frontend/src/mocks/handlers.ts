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
];
