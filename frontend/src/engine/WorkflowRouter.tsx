import { useState, useCallback } from 'react';
import type { AppConfig, ViewConfig } from '../engine/ConfigLoader';
import { StatCard } from '../components/StatCard';
import { DynamicTable } from '../components/DynamicTable';
import { DynamicForm } from '../components/DynamicForm';
import { DetailCard } from '../components/DetailCard';
import { track } from '../telemetry/sdk';

interface WorkflowRouterProps {
  config: AppConfig;
  activeViewId: string;
  onNavigate: (viewId: string, params?: Record<string, string>) => void;
  routeParams: Record<string, string>;
}

export function WorkflowRouter({ config, activeViewId, onNavigate, routeParams }: WorkflowRouterProps) {
  const view = config.ui.views.find(v => v.id === activeViewId);
  if (!view) return <div className="empty-state"><p>View "{activeViewId}" not found in config.</p></div>;

  return (
    <div>
      {view.components.map(comp => (
        <ComponentRenderer
          key={comp.id}
          comp={comp}
          view={view}
          appConfig={config}
          onNavigate={onNavigate}
          routeParams={routeParams}
        />
      ))}
    </div>
  );
}

function ComponentRenderer({
  comp, view, appConfig, onNavigate, routeParams
}: {
  comp: ViewConfig['components'][number];
  view: ViewConfig;
  appConfig: AppConfig;
  onNavigate: (viewId: string, params?: Record<string, string>) => void;
  routeParams: Record<string, string>;
}) {
  const handleRowClick = useCallback((row: Record<string, unknown>) => {
    const rowAction = comp.row_action as { type: string; target_view: string; param: string } | undefined;
    if (rowAction?.type === 'navigate') {
      track({ event_type: 'NAVIGATE', app_id: appConfig.app_id, context: { from: view.id, to: rowAction.target_view } });
      onNavigate(rowAction.target_view, { id: String(row[rowAction.param]) });
    }
  }, [comp.row_action, view.id, appConfig.app_id, onNavigate]);

  switch (comp.type) {
    case 'StatCard':
      return (
        <div className="stat-grid" key={comp.id} style={{ marginBottom: 0 }}>
          <StatCard config={comp as any} appConfig={appConfig} />
        </div>
      );

    case 'DataTable':
      return (
        <div style={{ marginBottom: 24 }}>
          <DynamicTable config={comp} appConfig={appConfig} onRowClick={handleRowClick} />
        </div>
      );

    case 'Form':
      return (
        <div style={{ marginBottom: 24 }}>
          <DynamicForm
            config={comp}
            appConfig={appConfig}
            apiBinding={view.api_binding!}
            onSuccess={() => {
              if (view.on_success?.navigate_to) {
                onNavigate(view.on_success.navigate_to);
              }
            }}
          />
        </div>
      );

    case 'DetailCard':
      return (
        <div style={{ marginBottom: 24 }}>
          <DetailCard config={comp} appConfig={appConfig} recordId={routeParams.id} />
        </div>
      );

    default:
      return (
        <div className="card" style={{ marginBottom: 16 }}>
          <span className="text-muted">Unknown component type: {comp.type}</span>
        </div>
      );
  }
}
