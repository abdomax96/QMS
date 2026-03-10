import type React from 'react';

// ============ KPI ============

export type KpiColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'orange';

export interface KpiTrend {
  /** نسبة التغيير عن الشهر الماضي */
  percent: number;
  direction: 'up' | 'down' | 'neutral';
  /** هل الارتفاع اتجاه إيجابي؟ (false للرفض والتأخر) */
  isPositive: boolean;
}

export interface KpiMetric {
  id: string;
  label: string;
  value: number | string;
  /** وحدة القياس تُعرض بعد القيمة */
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: KpiColor;
  trend?: KpiTrend;
  /** رابط عند الضغط على البطاقة */
  href?: string;
  /** يضيف حدوداً ملونة للأرقام الحرجة */
  highlight?: boolean;
  subtitle?: string;
}

// ============ Tab ============

export interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** عدد العناصر الحرجة (يُعرض badge أحمر) */
  alertCount?: number;
}

// ============ Monthly data (shared) ============

export interface MonthlyPoint {
  month: string;
  value: number;
}

// ============ Helpers ============

/** يحسب نسبة التغيير بين قيمتين */
export function calcTrend(current: number, previous: number): KpiTrend {
  if (previous === 0 && current === 0) return { percent: 0, direction: 'neutral', isPositive: true };
  if (previous === 0) return { percent: 100, direction: 'up', isPositive: true };
  const diff = ((current - previous) / previous) * 100;
  return {
    percent: Math.abs(Math.round(diff)),
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
    isPositive: true, // يُكتب فوقه في كل hook حسب المعنى
  };
}

/** يستخرج عدد العناصر في الشهر الحالي والشهر السابق */
export function countByMonth<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined
): { current: number; previous: number } {
  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const prevDate = new Date(curYear, curMonth - 1, 1);
  const prevMonth = prevDate.getMonth();
  const prevYear = prevDate.getFullYear();

  let current = 0;
  let previous = 0;
  for (const item of items) {
    const raw = getDate(item);
    if (!raw) continue;
    const d = new Date(raw);
    if (d.getMonth() === curMonth && d.getFullYear() === curYear) current++;
    else if (d.getMonth() === prevMonth && d.getFullYear() === prevYear) previous++;
  }
  return { current, previous };
}
