import { useEffect, useState } from 'react';
import { buildApiClient } from '../engine/ApiClient';
import type { AppConfig, ComponentConfig } from '../engine/ConfigLoader';
import { formatValue, StatusBadge } from './Formatters';

interface DetailField { key: string; label: string; format?: string; }

interface DetailCardProps {
  config: ComponentConfig;
  appConfig: AppConfig;
  recordId: string;
}

export function DetailCard({ config, appConfig, recordId }: DetailCardProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const fields = config.fields as DetailField[];

  useEffect(() => {
    const client = buildApiClient(appConfig);
    client.call('get_invoice', { params: { id: recordId } })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [appConfig, recordId]);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!data) return <div className="empty-state"><p>Record not found.</p></div>;

  return (
    <div className="detail-card">
      {fields.map(f => (
        <div className="detail-field" key={f.key}>
          <span className="detail-field-label">{f.label}</span>
          <span className="detail-field-value">
            {f.format === 'badge'
              ? <StatusBadge value={data[f.key] as string} />
              : formatValue(data[f.key], f.format)
            }
          </span>
        </div>
      ))}
    </div>
  );
}
