import { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, X, Eye, Brain, Clock } from 'lucide-react';
import { CONTROL_PLANE, APP_ID } from '../engine/ConfigLoader';

interface Mutation {
  mutation_id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'experimenting';
  source: string;
  patch: string;
  created_at: string;
}

interface MutationsInboxProps {
  onConfigChanged: () => void;
}

export function MutationsInbox({ onConfigChanged }: MutationsInboxProps) {
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; config: unknown } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const load = () => {
    setLoading(true);
    axios.get(`${CONTROL_PLANE}/api/apps/${APP_ID}/mutations`)
      .then(r => setMutations(r.data.mutations))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const act = async (mutationId: string, action: 'approve' | 'reject' | 'experiment') => {
    setActing(mutationId);
    try {
      await axios.post(`${CONTROL_PLANE}/api/apps/${APP_ID}/mutations/${mutationId}/${action}`);
      const msgs: Record<string, string> = {
        approve: '✅ Mutation approved & deployed!',
        reject: '❌ Mutation rejected.',
        experiment: '🧪 Experiment started (50% traffic)'
      };
      showToast(msgs[action]);
      load();
      if (action === 'approve' || action === 'experiment') onConfigChanged();
    } catch (e: any) {
      showToast(`Error: ${e.response?.data?.error ?? e.message}`);
    } finally {
      setActing(null);
    }
  };

  const loadPreview = async (mutationId: string) => {
    try {
      const { data } = await axios.get(
        `${CONTROL_PLANE}/api/apps/${APP_ID}/mutations/${mutationId}/preview`
      );
      setPreview({ id: mutationId, config: data.preview_config });
    } catch (e) {
      showToast('Could not load preview.');
    }
  };

  const pending  = mutations.filter(m => m.status === 'pending');
  const experimenting = mutations.filter(m => m.status === 'experimenting');
  const resolved = mutations.filter(m => m.status === 'approved' || m.status === 'rejected');

  const renderPatchCode = (patchStr: string) => {
    try {
      const parsed = JSON.parse(patchStr);
      if (parsed.css || parsed.js) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {parsed.css && <div><strong style={{fontSize: 11, color: 'var(--accent)'}}>INJECT CSS:</strong><pre className="mutation-patch" style={{marginTop: 4}}>{parsed.css}</pre></div>}
            {parsed.js && <div><strong style={{fontSize: 11, color: '#f59e0b'}}>INJECT JS:</strong><pre className="mutation-patch" style={{marginTop: 4}}>{parsed.js}</pre></div>}
          </div>
        );
      }
      return <pre className="mutation-patch" style={{marginTop: '12px'}}>{JSON.stringify(parsed, null, 2)}</pre>;
    } catch {
      return <pre className="mutation-patch" style={{marginTop: '12px'}}>{patchStr}</pre>;
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>AI Mutations Inbox</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          Review and approve AI-suggested UI and workflow changes before they go live.
        </p>
      </div>

      {/* Pending */}
      <div style={{ marginBottom: 32 }}>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} style={{ color: 'var(--warning)' }} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>Pending Review ({pending.length})</span>
        </div>

        {pending.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <h3>All caught up</h3>
            <p>No pending mutations. The AI hasn't suggested anything new yet.</p>
          </div>
        ) : (
          pending.map(m => (
            <div className="mutation-card" key={m.mutation_id}>
              <div className="mutation-card-header">
                <div>
                  <div className="mutation-title">{m.title}</div>
                  <div className="text-muted" style={{ marginTop: 4 }}>{new Date(m.created_at).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="mutation-source-badge">
                    <Brain size={10} style={{ display: 'inline', marginRight: 3 }} />
                    {m.source}
                  </span>
                </div>
              </div>
              <p className="mutation-desc">{m.description}</p>
              {renderPatchCode(m.patch)}

              {preview?.id === m.mutation_id && (
                <div style={{ marginBottom: 16, padding: 16, background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-active)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>Shadow Preview Config</div>
                  <pre className="mutation-patch" style={{ maxHeight: 200, overflow: 'auto' }}>
                    {JSON.stringify(preview.config, null, 2)}
                  </pre>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPreview(null)}>Close Preview</button>
                </div>
              )}

              <div className="mutation-actions">
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => act(m.mutation_id, 'approve')}
                  disabled={acting === m.mutation_id}
                >
                  <Check size={13} /> Approve & Deploy
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => act(m.mutation_id, 'experiment')}
                  disabled={acting === m.mutation_id}
                >
                  <Brain size={13} /> Start A/B Experiment
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => act(m.mutation_id, 'reject')}
                  disabled={acting === m.mutation_id}
                >
                  <X size={13} /> Reject
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => loadPreview(m.mutation_id)}
                >
                  <Eye size={13} /> Shadow Preview
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Experimenting */}
      {experimenting.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div className="flex items-center gap-2 mb-4">
            <Brain size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Active Experiments ({experimenting.length})</span>
          </div>
          {experimenting.map(m => (
            <div className="mutation-card" key={m.mutation_id} style={{ borderLeft: '3px solid var(--accent)' }}>
              <div className="mutation-card-header">
                <div>
                  <div className="mutation-title">{m.title}</div>
                  <div className="text-muted" style={{ marginTop: 4 }}>Deployed: {new Date(m.created_at).toLocaleString()}</div>
                </div>
                <span className="badge badge-pending">Experimenting (50%)</span>
              </div>
              <p className="mutation-desc">{m.description}</p>
              {renderPatchCode(m.patch)}
              
              <div className="mutation-actions" style={{ marginTop: 16 }}>
                <button className="btn btn-success btn-sm" onClick={() => act(m.mutation_id, 'approve')} disabled={acting === m.mutation_id}>
                  <Check size={13} /> Conclude & Rollout (100%)
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => act(m.mutation_id, 'reject')} disabled={acting === m.mutation_id}>
                  <X size={13} /> Halt Experiment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Check size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)' }}>Resolved ({resolved.length})</span>
          </div>
          {resolved.map(m => (
            <div className="mutation-card" key={m.mutation_id} style={{ opacity: 0.55 }}>
              <div className="mutation-card-header">
                <span className="mutation-title">{m.title}</span>
                <span className={`badge ${m.status === 'approved' ? 'badge-paid' : 'badge-overdue'}`}>
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.startsWith('✅') ? 'toast-success' : 'toast-error'}`}>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
