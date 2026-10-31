import { describe, expect, it } from 'vitest';
import { illustrativeSchedule } from './illustrativeSchedule';
describe('illustrativeSchedule', () => {
  it('splits integer paise exactly, with remainder paise on earliest installments', () => {
    const rows = illustrativeSchedule(1001, 0, 3, '2026-01-31');
    expect(rows.map((row) => row.amountPaise)).toEqual([334, 334, 333]);
    expect(rows.reduce((sum, row) => sum + row.amountPaise, 0)).toBe(1001);
  });
  it('preserves intended month end after clamping February', () => {
    const rows = illustrativeSchedule(3000, 0, 3, '2026-01-31');
    expect(rows.map((row) => row.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });
});
