/** Website-only illustration. This mirrors the backend's largest-remainder rule and is not authoritative. */
export function illustrativeSchedule(
  totalPaise: number,
  downPaise: number,
  count: number,
  firstDate: string,
) {
  const balance = Math.max(0, totalPaise - downPaise);
  const base = Math.floor(balance / count);
  const remainder = balance % count;
  const anchor = new Date(`${firstDate}T12:00:00`);
  return Array.from({ length: count }, (_, i) => {
    const month = new Date(anchor.getFullYear(), anchor.getMonth() + i, 1);
    const day = Math.min(
      anchor.getDate(),
      new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    );
    return {
      number: i + 1,
      date: new Date(month.getFullYear(), month.getMonth(), day, 12).toISOString().slice(0, 10),
      amountPaise: base + (i < remainder ? 1 : 0),
    };
  });
}
