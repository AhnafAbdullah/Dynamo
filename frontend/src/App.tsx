import { useState, useEffect } from 'react';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { useAppConfig, APP_ID, CONTROL_PLANE } from './engine/ConfigLoader';
import { WorkflowRouter } from './engine/WorkflowRouter';
import { Sidebar } from './components/Sidebar';
import { MutationsInbox } from './components/MutationsInbox';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { track } from './telemetry/sdk';
import axios from 'axios';
import './index.css';


export default function App() {
  const { config, loading, error, refresh } = useAppConfig();
  const [activeViewId, setActiveViewId] = useState<string>('view-dashboard');
  const [routeParams, setRouteParams] = useState<Record<string, string>>({});
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Poll pending mutation count for badge
  useEffect(() => {
    const poll = () => {
      axios.get(`${CONTROL_PLANE}/api/apps/${APP_ID}/mutations`)
        .then(r => setPendingCount(r.data.mutations.filter((m: any) => m.status === 'pending').length))
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 15000);
    return () => clearInterval(t);
  }, []);

  const navigate = (viewId: string, params?: Record<string, string>) => {
    setNavHistory(h => [...h, activeViewId]);
    setActiveViewId(viewId);
    setRouteParams(params ?? {});
    track({ event_type: 'NAVIGATE', app_id: config?.app_id ?? 'unknown', context: { to: viewId } });
  };

  const goBack = () => {
    const prev = navHistory[navHistory.length - 1];
    if (prev) {
      setNavHistory(h => h.slice(0, -1));
      setActiveViewId(prev);
      setRouteParams({});
    }
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p>Loading application from Control Plane…</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="loading-page">
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h3>Cannot connect to Control Plane</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 360, textAlign: 'center' }}>
          Make sure the Control Plane API is running on <code>http://localhost:3001</code> and the demo app is seeded.
        </p>
        <button className="btn btn-primary" onClick={refresh}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const activeView = config.ui.views.find(v => v.id === activeViewId);
  const isSpecial = activeViewId === '__mutations__' || activeViewId === '__analytics__';
  const viewTitle = isSpecial
    ? (activeViewId === '__mutations__' ? 'AI Mutations Inbox' : 'Analytics')
    : (activeView?.title ?? activeViewId);

  return (
    <div className="app-shell">
      <Sidebar
        config={config}
        activeViewId={activeViewId}
        onNavigate={(id) => {
          setNavHistory([]);
          setActiveViewId(id);
          setRouteParams({});
        }}
        pendingMutations={pendingCount}
        onOpenInbox={() => {
          setNavHistory([]);
          setActiveViewId('__mutations__');
        }}
      />

      <div className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {navHistory.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={goBack} style={{ padding: '5px 10px' }}>
                <ArrowLeft size={13} />
              </button>
            )}
            <div>
              <div className="topbar-title">{viewTitle}</div>
              <div className="topbar-breadcrumb">
                {config.name} › {viewTitle}
                {config.version && <span style={{ marginLeft: 8, color: 'var(--accent)', fontSize: 10 }}>v{config.version}</span>}
              </div>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={refresh} title="Reload config">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">
          {activeViewId === '__mutations__' ? (
            <MutationsInbox onConfigChanged={() => { refresh(); setPendingCount(0); }} />
          ) : activeViewId === '__analytics__' ? (
            <AnalyticsDashboard />
          ) : (
            <WorkflowRouter
              config={config}
              activeViewId={activeViewId}
              onNavigate={navigate}
              routeParams={routeParams}
            />
          )}
        </div>
      </div>
    </div>
}
