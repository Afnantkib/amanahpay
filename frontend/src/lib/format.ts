export const inr = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
export const shortDate = (value: string, locale = 'en-IN') =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(
    new Date(`${value}T12:00:00`),
  );
