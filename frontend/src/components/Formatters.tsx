/** Utility — formats values based on a format key from the config. */
export function formatValue(value: unknown, format?: string): string {
  if (value === null || value === undefined) return '—';
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
    case 'date':
      return new Date(value as string).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    case 'datetime':
      return new Date(value as string).toLocaleString('en-US');
    default:
      return String(value);
  }
}

export function StatusBadge({ value }: { value: string }) {
  const cls = {
    paid:    'badge badge-paid',
    pending: 'badge badge-pending',
    overdue: 'badge badge-overdue',
  }[value?.toLowerCase()] ?? 'badge badge-default';

  return <span className={cls}>{value}</span>;
}
