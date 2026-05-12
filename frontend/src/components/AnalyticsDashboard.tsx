import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart2, TrendingUp, Users, MousePointerClick,
  AlertTriangle, Navigation, RefreshCw, Activity
} from 'lucide-react';

const GATEWAY = 'http://localhost:3002';
const APP_ID  = 'app-demo-001';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Summary    { total: number; sessions: number; by_type: { event_type: string; count: number }[] }
interface NavFlow    { flows: { path: string; count: number }[] }
interface WfPaths    { paths: { path: string; count: number }[] }
interface FormStats  { form_interactions: number; form_submits: number; api_errors: number; abandonment_rate: string }
interface Volume     { volume: { hour: string; count: number }[] }
interface Sessions   { sessions: { session_id: string; started_at: string; last_at: string; event_count: number }[] }

// ─── Helpers ───────────────────────────────────────────────────────────────────
function StatTile({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color?: string }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span className="stat-label">{label}</span>
        <Icon size={16} style={{ color: color ?? 'var(--accent)', opacity: 0.7 }} />
      </div>
      <div className="stat-value" style={{ fontSize: 28 }}>{value}</div>
    </div>
  );
}

function MiniBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--text-secondary)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ color: 'var(--text-muted)', marginLeft: 8, flexShrink: 0 }}>{count}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--purple))', borderRadius: 99, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function VolumeSparkline({ data }: { data: { hour: string; count: number }[] }) {
  if (!data.length) return <div className="text-muted" style={{ textAlign: 'center', padding: 20 }}>No data yet</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 680, h = 100;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.count / max) * (h - 10);
    return `${x},${y}`;
  });
  const area = `M${pts[0]} L${pts.join(' L')} L${w},${h} L0,${h} Z`;
  const line = `M${pts.join(' L')}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 80 }}>
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#grad)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i}
          cx={(i / (data.length - 1)) * w}
          cy={h - (d.count / max) * (h - 10)}
          r="3" fill="var(--accent)"
        >
          <title>{d.hour.slice(11, 16)} — {d.count} events</title>
        </circle>
      ))}
    </svg>
  );
}

// ─── Main Analytics Dashboard ──────────────────────────────────────────────────
export function AnalyticsDashboard() {
  const [summary,   setSummary]   = useState<Summary | null>(null);
  const [navFlow,   setNavFlow]   = useState<NavFlow | null>(null);
  const [wfPaths,   setWfPaths]   = useState<WfPaths | null>(null);
  const [formStats, setFormStats] = useState<FormStats | null>(null);
  const [volume,    setVolume]    = useState<Volume | null>(null);
  const [sessions,  setSessions]  = useState<Sessions | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [seeding,   setSeeding]   = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, nf, wp, fs, v, sess] = await Promise.all([
        axios.get(`${GATEWAY}/analytics/summary?app_id=${APP_ID}`),
        axios.get(`${GATEWAY}/analytics/navigation-flow?app_id=${APP_ID}`),
        axios.get(`${GATEWAY}/analytics/workflow-paths?app_id=${APP_ID}`),
        axios.get(`${GATEWAY}/analytics/form-stats?app_id=${APP_ID}`),
        axios.get(`${GATEWAY}/analytics/volume?app_id=${APP_ID}`),
        axios.get(`${GATEWAY}/analytics/sessions?app_id=${APP_ID}&limit=8`),
      ]);
      setSummary(s.data);
      setNavFlow(nf.data);
      setWfPaths(wp.data);
      setFormStats(fs.data);
      setVolume(v.data);
      setSessions(sess.data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const seedDemoData = async () => {
    setSeeding(true);
    await axios.post(`${GATEWAY}/dev/seed-events`).catch(console.error);
    setSeeding(false);
    await load();
  };

  const maxNavCount = navFlow?.flows[0]?.count || 1;
  const maxWfCount  = wfPaths?.paths[0]?.count  || 1;
  const byTypeMax   = summary?.by_type?.[0]?.count || 1;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Behavioral Analytics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Real-time telemetry from the Adaptive UI Engine · Last refreshed {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={seedDemoData} disabled={seeding}>
            {seeding ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Seeding…</> : '⚡ Seed Demo Events'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : (
        <>
          {/* ── Top Stats ── */}
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', marginBottom: 24 }}>
            <StatTile label="Total Events"    value={summary?.total    ?? 0} icon={Activity}          color="var(--accent)"  />
            <StatTile label="Unique Sessions" value={summary?.sessions ?? 0} icon={Users}             color="var(--purple)"  />
            <StatTile label="Form Interactions" value={formStats?.form_interactions ?? 0} icon={MousePointerClick} color="var(--success)" />
            <StatTile label="Form Submits"    value={formStats?.form_submits    ?? 0} icon={TrendingUp}        color="var(--warning)" />
            <StatTile label="API Errors"      value={formStats?.api_errors      ?? 0} icon={AlertTriangle}     color="var(--danger)"  />
            <StatTile label="Abandonment"     value={`${formStats?.abandonment_rate ?? 0}%`} icon={Navigation} color="var(--warning)" />
          </div>

          {/* ── Event Volume Sparkline ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <BarChart2 size={15} style={{ color: 'var(--accent)' }} />
              <span className="card-title" style={{ margin: 0 }}>Event Volume — Last 24 Hours</span>
            </div>
            <VolumeSparkline data={volume?.volume ?? []} />
            {(!volume?.volume?.length) && (
              <p className="text-muted" style={{ textAlign: 'center', marginTop: 8 }}>
                Interact with the app or click "Seed Demo Events" to populate data.
              </p>
            )}
          </div>

          {/* ── Two Column ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Navigation Flow */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Navigation size={14} style={{ color: 'var(--accent)' }} />
                <span className="card-title" style={{ margin: 0 }}>Navigation Transitions</span>
              </div>
              {navFlow?.flows.length ? (
                navFlow.flows.slice(0, 8).map(f => (
                  <MiniBar key={f.path} label={f.path} count={f.count} max={maxNavCount} />
                ))
              ) : (
                <p className="text-muted">No navigation events yet.</p>
              )}
            </div>

            {/* Event Type Breakdown */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Activity size={14} style={{ color: 'var(--purple)' }} />
                <span className="card-title" style={{ margin: 0 }}>Event Type Breakdown</span>
              </div>
              {summary?.by_type?.length ? (
                summary.by_type.map(t => (
                  <MiniBar key={t.event_type} label={t.event_type} count={t.count} max={byTypeMax} />
                ))
              ) : (
                <p className="text-muted">No events recorded yet.</p>
              )}
            </div>
          </div>

          {/* ── Workflow Paths ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <TrendingUp size={14} style={{ color: 'var(--success)' }} />
              <span className="card-title" style={{ margin: 0 }}>Top User Journey Paths</span>
              <span className="text-muted" style={{ marginLeft: 'auto' }}>Most common multi-step navigation sequences per session</span>
            </div>
            {wfPaths?.paths.length ? (
              wfPaths.paths.slice(0, 8).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', width: 20 }}>#{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {p.path.replace(/view-/g, '')}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>{p.count}×</span>
                  <div style={{ width: 80, height: 4, background: 'var(--bg-elevated)', borderRadius: 99 }}>
                    <div style={{ width: `${(p.count / maxWfCount) * 100}%`, height: '100%', background: 'var(--success)', borderRadius: 99 }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted">No multi-step sessions yet. Use the app to generate session paths.</p>
            )}
          </div>

          {/* ── Recent Sessions ── */}
          <div className="table-container">
            <div className="table-header">
              <span className="table-header-title">Recent Sessions</span>
              <span className="text-muted">{sessions?.sessions.length ?? 0} sessions shown</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Started</th>
                  <th>Last Active</th>
                  <th>Events</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {sessions?.sessions.length ? sessions.sessions.map(s => {
                  const dur = Math.round((new Date(s.last_at).getTime() - new Date(s.started_at).getTime()) / 1000);
                  return (
                    <tr key={s.session_id} style={{ cursor: 'default' }}>
                      <td><span className="mono" style={{ color: 'var(--text-muted)' }}>{s.session_id.slice(0, 16)}…</span></td>
                      <td>{new Date(s.started_at).toLocaleTimeString()}</td>
                      <td>{new Date(s.last_at).toLocaleTimeString()}</td>
                      <td><span style={{ color: 'var(--accent)', fontWeight: 600 }}>{s.event_count}</span></td>
                      <td>{dur}s</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5}><div className="empty-state"><p>No sessions yet.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
