import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { formatValue, StatusBadge } from './Formatters';
import { track } from '../telemetry/sdk';
import type { AppConfig, ComponentConfig } from '../engine/ConfigLoader';
import { buildApiClient } from '../engine/ApiClient';

interface Column { key: string; label: string; format?: string; }

interface DataTableProps {
  config: ComponentConfig;
  appConfig: AppConfig;
  onRowClick?: (row: Record<string, unknown>) => void;
}

export function DynamicTable({ config, appConfig, onRowClick }: DataTableProps) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const columns = config.columns as Column[];
  const title = config.title as string | undefined;
  const searchable = config.searchable as boolean | undefined;

  useEffect(() => {
    const client = buildApiClient(appConfig);
    client.call(config.api_binding as string)
      .then(d => setData(Array.isArray(d) ? d : [d]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [config.api_binding, appConfig]);

  const filtered = search
    ? data.filter(row =>
        columns.some(col =>
          String(row[col.key] ?? '').toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  const handleRowClick = (row: Record<string, unknown>) => {
    track({ event_type: 'CLICK', app_id: appConfig.app_id, context: { component: config.id, row_id: row['id'] } });
    onRowClick?.(row);
  };

  return (
    <div className="table-container">
      <div className="table-header">
        <span className="table-header-title">{title ?? 'Data'}</span>
        {searchable && (
          <div className="table-search">
            <Search size={13} />
            <input
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>No records</h3>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map(col => <th key={col.key}>{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} onClick={() => handleRowClick(row)}>
                {columns.map(col => (
                  <td key={col.key}>
                    {col.format === 'badge'
                      ? <StatusBadge value={row[col.key] as string} />
                      : formatValue(row[col.key], col.format)
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
