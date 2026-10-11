export interface DailyReport {
  date: string;
  timezone: 'America/Lima';
  currency: 'PEN';
  totalRevenue: number;
  completedOrders: number;
  bestSellingDish: { id: string | null; name: string; units: number } | null;
  averageOccupancyPercent: number | null;
  occupancy: { observedSeconds: number; elapsedSeconds: number; coveragePercent: number };
  dataQuality: { estimatedPaymentDates: number; estimatedCompletionDates: number };
}

export function isDailyReport(value: unknown, date: string): value is DailyReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as DailyReport;
  const nonnegative = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const count = (n: unknown) => nonnegative(n) && Number.isSafeInteger(n);
  const percent = (n: unknown) => nonnegative(n) && (n as number) <= 100;
  const dish = report.bestSellingDish;
  return report.date === date && report.timezone === 'America/Lima' && report.currency === 'PEN'
    && nonnegative(report.totalRevenue) && count(report.completedOrders)
    && (dish === null || Boolean(dish && (dish.id === null || typeof dish.id === 'string')
      && typeof dish.name === 'string' && count(dish.units)))
    && (report.averageOccupancyPercent === null || percent(report.averageOccupancyPercent))
    && Boolean(report.occupancy && nonnegative(report.occupancy.observedSeconds)
      && nonnegative(report.occupancy.elapsedSeconds) && percent(report.occupancy.coveragePercent))
    && Boolean(report.dataQuality && count(report.dataQuality.estimatedPaymentDates)
      && count(report.dataQuality.estimatedCompletionDates));
}

export function limaDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isReportDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '2000-01-01' || date > '2099-12-31') return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
