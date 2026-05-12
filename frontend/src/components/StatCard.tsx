import { useEffect, useState } from 'react';
import { buildApiClient } from '../engine/ApiClient';
import type { AppConfig, ComponentConfig } from '../engine/ConfigLoader';

interface StatCardConfig extends ComponentConfig {
  label: string;
  aggregate: 'count' | 'sum';
  filter?: Record<string, string>;
}

interface StatCardProps {
  config: StatCardConfig;
  appConfig: AppConfig;
}

export function StatCard({ config, appConfig }: StatCardProps) {
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = buildApiClient(appConfig);
    client.call(config.api_binding as string)
      .then((data: unknown) => {
        let rows = Array.isArray(data) ? data as Record<string, unknown>[] : [];
        if (config.filter) {
          rows = rows.filter(r =>
            Object.entries(config.filter!).every(([k, v]) => r[k] === v)
          );
        }
        setValue(config.aggregate === 'count' ? rows.length : rows.reduce((s, r) => s + Number(r['amount'] ?? 0), 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config, appConfig]);

  return (
    <div className="stat-card">
      <div className="stat-label">{config.label}</div>
      <div className="stat-value">
        {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : value ?? '—'}
      </div>
    </div>
  );
}
