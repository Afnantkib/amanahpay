/** Frontend-only mock contract. No backend DTO/OpenAPI schema exists yet; see /docs/frontend-api-map.md. */
export type PlanStatus = 'On track' | 'Due soon' | 'Overdue';
export interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  activePlans: number;
  paidPaise: number;
  pendingPaise: number;
  nextDue: string;
  status: PlanStatus;
}
export interface DashboardSummary {
  collectedPaise: number;
  pendingPaise: number;
  overduePaise: number;
  upcomingPaise: number;
  dueToday: Array<{
    id: string;
    customer: string;
    item: string;
    amountPaise: number;
    due: string;
    status: PlanStatus;
  }>;
}
export interface MockPlan {
  id: string;
  customer: string;
  item: string;
  totalPaise: number;
  monthlyPaise: number;
  remainingPaise: number;
  status: PlanStatus;
  nextDue: string;
}
export interface ScheduleRow {
  number: number;
  dueDate: string;
  amountPaise: number;
  state: 'PAID' | 'DUE' | 'UPCOMING';
}
