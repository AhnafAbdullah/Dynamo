import {
  LayoutDashboard, FileText, PlusCircle, Brain, Activity,
  ChevronRight, Inbox
} from 'lucide-react';
import type { AppConfig } from '../engine/ConfigLoader';
import { track } from '../telemetry/sdk';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard, FileText, PlusCircle, Brain, Activity, Inbox,
};

interface SidebarProps {
  config: AppConfig;
  activeViewId: string;
  onNavigate: (viewId: string) => void;
  pendingMutations: number;
  onOpenInbox: () => void;
}

export function Sidebar({ config, activeViewId, onNavigate, pendingMutations, onOpenInbox }: SidebarProps) {
  const handleNav = (viewId: string) => {
    track({ event_type: 'NAVIGATE', app_id: config.app_id, context: { to: viewId } });
    onNavigate(viewId);
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">AR</div>
        <div>
          <div className="sidebar-logo-text">{config.name}</div>
          <div className="sidebar-logo-sub">Adaptive Runtime v{config.version}</div>
        </div>
      </div>

      {/* App Nav */}
      <div style={{ flex: 1 }}>
        <div className="sidebar-section-label">Application</div>
        <nav className="sidebar-nav">
          {config.ui.sidebar.map(item => {
            const Icon = ICON_MAP[item.icon] ?? ChevronRight;
            const isActive = activeViewId === item.view_id;
            return (
              <button
                key={item.view_id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNav(item.view_id)}
              >
                <Icon size={15} className="sidebar-icon" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Admin */}
        <div className="sidebar-section-label">Admin</div>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeViewId === '__mutations__' ? 'active' : ''}`}
            onClick={onOpenInbox}
          >
            <Brain size={15} />
            AI Inbox
            {pendingMutations > 0 && (
              <span className="sidebar-badge">{pendingMutations}</span>
            )}
          </button>
          <button
            className={`sidebar-nav-item ${activeViewId === '__analytics__' ? 'active' : ''}`}
            onClick={() => onNavigate('__analytics__')}
          >
            <Activity size={15} />
            Analytics
          </button>
        </nav>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          Adaptive Runtime Platform
        </div>
      </div>
    </aside>
  );
}
