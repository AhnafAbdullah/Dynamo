require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./eventDb');

const app = express();
const PORT = process.env.EVENT_GATEWAY_PORT || 3002;

// ─── Mock invoice data store ──────────────────────────────────────────────────
const mockInvoices = [
  { id: 'INV-001', client: 'Acme Corp',       amount: 4200,  status: 'paid',    due_date: '2026-05-01', notes: 'Q1 retainer' },
  { id: 'INV-002', client: 'Globex Inc',       amount: 8750,  status: 'pending', due_date: '2026-05-15', notes: 'Web redesign phase 1' },
  { id: 'INV-003', client: 'Initech Ltd',      amount: 1300,  status: 'overdue', due_date: '2026-04-20', notes: 'Consulting hours' },
  { id: 'INV-004', client: 'Umbrella Co',      amount: 22000, status: 'pending', due_date: '2026-05-30', notes: 'Annual SaaS license' },
  { id: 'INV-005', client: 'Massive Dynamic',  amount: 5500,  status: 'paid',    due_date: '2026-04-28', notes: 'R&D project milestone 2' },
  { id: 'INV-006', client: 'Bluth Company',    amount: 3100,  status: 'overdue', due_date: '2026-04-10', notes: 'Infrastructure setup' }
];

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ─── Mock REST API ────────────────────────────────────────────────────────────
app.get('/mock/invoices', (_req, res) => res.json(mockInvoices));
app.get('/mock/invoices/:id', (req, res) => {
  const inv = mockInvoices.find(i => i.id === req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  res.json(inv);
});
app.post('/mock/invoices', (req, res) => {
  const newInv = { id: `INV-${String(mockInvoices.length + 1).padStart(3, '0')}`, ...req.body };
  mockInvoices.push(newInv);
  res.status(201).json(newInv);
});
app.put('/mock/invoices/:id', (req, res) => {
  const idx = mockInvoices.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  mockInvoices[idx] = { ...mockInvoices[idx], ...req.body };
  res.json(mockInvoices[idx]);
});
app.delete('/mock/invoices/:id', (req, res) => {
  const idx = mockInvoices.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  mockInvoices.splice(idx, 1);
  res.json({ message: 'Deleted' });
});

// ─── Prepared statements ──────────────────────────────────────────────────────
const insertEvent = db.prepare(
  'INSERT OR IGNORE INTO events (event_id, tenant_id, app_id, user_id, session_id, event_type, context, timestamp) VALUES (?,?,?,?,?,?,?,?)'
);

// ─── Telemetry Ingestion ──────────────────────────────────────────────────────
app.post('/events', (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  const insertMany = db.transaction((evts) => {
    for (const e of evts) {
      insertEvent.run(
        uuidv4(),
        e.tenant_id  || 'default',
        e.app_id     || 'unknown',
        e.user_id    || 'anonymous',
        e.session_id || 'unknown',
        e.event_type || 'UNKNOWN',
        JSON.stringify(e.context || {}),
        new Date().toISOString()
      );
    }
  });
  insertMany(events);
  res.status(202).json({ accepted: events.length });
});

// ─── Analytics: Event totals by type ─────────────────────────────────────────
app.get('/analytics/summary', (req, res) => {
  const { app_id, since } = req.query;
  const sinceTs = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const total = db.prepare(
    'SELECT COUNT(*) as count FROM events WHERE app_id = ? AND timestamp >= ?'
  ).get(app_id || 'app-demo-001', sinceTs);

  const byType = db.prepare(
    'SELECT event_type, COUNT(*) as count FROM events WHERE app_id = ? AND timestamp >= ? GROUP BY event_type ORDER BY count DESC'
  ).all(app_id || 'app-demo-001', sinceTs);

  const sessions = db.prepare(
    'SELECT COUNT(DISTINCT session_id) as count FROM events WHERE app_id = ? AND timestamp >= ?'
  ).get(app_id || 'app-demo-001', sinceTs);

  res.json({ total: total.count, sessions: sessions.count, by_type: byType });
});

// ─── Analytics: Navigation flow (source → destination pairs) ─────────────────
app.get('/analytics/navigation-flow', (req, res) => {
  const { app_id } = req.query;
  const appId = app_id || 'app-demo-001';

  const rows = db.prepare(
    `SELECT context FROM events WHERE app_id = ? AND event_type = 'NAVIGATE' ORDER BY timestamp ASC LIMIT 5000`
  ).all(appId);

  // Count transitions between views
  const flowMap = {};
  for (const row of rows) {
    try {
      const ctx = JSON.parse(row.context);
      if (ctx.to) {
        const key = `${ctx.from || 'entry'} → ${ctx.to}`;
        flowMap[key] = (flowMap[key] || 0) + 1;
      }
    } catch (_) {}
  }

  const flows = Object.entries(flowMap)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count);

  res.json({ flows });
});

// ─── Analytics: Session timelines (for funnel) ───────────────────────────────
app.get('/analytics/sessions', (req, res) => {
  const { app_id, limit = 50 } = req.query;
  const appId = app_id || 'app-demo-001';

  const sessions = db.prepare(
    `SELECT session_id,
            MIN(timestamp) as started_at,
            MAX(timestamp) as last_at,
            COUNT(*) as event_count
     FROM events WHERE app_id = ?
     GROUP BY session_id
     ORDER BY started_at DESC
     LIMIT ?`
  ).all(appId, parseInt(limit));

  res.json({ sessions });
});

// ─── Analytics: Hourly event volume (last 24h) ────────────────────────────────
app.get('/analytics/volume', (req, res) => {
  const { app_id } = req.query;
  const appId = app_id || 'app-demo-001';
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const rows = db.prepare(
    `SELECT strftime('%Y-%m-%dT%H:00:00', timestamp) as hour, COUNT(*) as count
     FROM events WHERE app_id = ? AND timestamp >= ?
     GROUP BY hour ORDER BY hour ASC`
  ).all(appId, since);

  res.json({ volume: rows });
});

// ─── Analytics: Top workflow paths per session ────────────────────────────────
app.get('/analytics/workflow-paths', (req, res) => {
  const { app_id } = req.query;
  const appId = app_id || 'app-demo-001';

  // Get navigate events grouped by session, then build paths
  const navEvents = db.prepare(
    `SELECT session_id, context, timestamp FROM events
     WHERE app_id = ? AND event_type = 'NAVIGATE'
     ORDER BY session_id, timestamp ASC LIMIT 10000`
  ).all(appId);

  const bySession = {};
  for (const e of navEvents) {
    const ctx = JSON.parse(e.context);
    if (!bySession[e.session_id]) bySession[e.session_id] = [];
    if (ctx.to) bySession[e.session_id].push(ctx.to);
  }

  // Build path strings and count
  const pathCounts = {};
  for (const path of Object.values(bySession)) {
    if (path.length < 2) continue;
    const key = path.join(' → ');
    pathCounts[key] = (pathCounts[key] || 0) + 1;
  }

  const paths = Object.entries(pathCounts)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.json({ paths });
});

// ─── Analytics: Form abandonment rates ───────────────────────────────────────
app.get('/analytics/form-stats', (req, res) => {
  const { app_id } = req.query;
  const appId = app_id || 'app-demo-001';

  const focuses = db.prepare(
    `SELECT COUNT(*) as count FROM events WHERE app_id = ? AND event_type = 'INPUT_FOCUS'`
  ).get(appId);

  const submits = db.prepare(
    `SELECT COUNT(*) as count FROM events WHERE app_id = ? AND event_type = 'WORKFLOW_STEP' AND context LIKE '%form_submit%'`
  ).get(appId);

  const errors = db.prepare(
    `SELECT COUNT(*) as count FROM events WHERE app_id = ? AND event_type = 'API_ERROR'`
  ).get(appId);

  res.json({
    form_interactions: focuses.count,
    form_submits: submits.count,
    api_errors: errors.count,
    abandonment_rate: focuses.count > 0
      ? (((focuses.count - submits.count) / focuses.count) * 100).toFixed(1)
      : 0
  });
});

// ─── Seed demo telemetry data ─────────────────────────────────────────────────
app.post('/dev/seed-events', (_req, res) => {
  const views = ['view-dashboard', 'view-invoices', 'view-invoice-detail', 'view-new-invoice'];
  const users = ['user-alice', 'user-bob', 'user-carol', 'user-dave'];
  const eventTypes = ['NAVIGATE', 'CLICK', 'INPUT_FOCUS', 'WORKFLOW_STEP', 'API_ERROR'];
  const appId = 'app-demo-001';

  const insertMany = db.transaction(() => {
    for (let i = 0; i < 200; i++) {
      const sessionId = `session-demo-${Math.floor(i / 4)}`;
      const userId = users[i % users.length];
      const from = views[Math.floor(Math.random() * views.length)];
      const to = views[Math.floor(Math.random() * views.length)];
      const etype = eventTypes[Math.floor(Math.random() * eventTypes.length)];

      const ctx = etype === 'NAVIGATE'
        ? { from, to }
        : etype === 'INPUT_FOCUS'
        ? { field: ['client', 'amount', 'due_date', 'status'][Math.floor(Math.random() * 4)] }
        : etype === 'WORKFLOW_STEP'
        ? { action: 'form_submit', form_id: 'form-new-invoice' }
        : { component: `tbl-${Math.floor(Math.random() * 2)}` };

      // Spread over the last 48 hours
      const ts = new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000).toISOString();

      insertEvent.run(uuidv4(), 'default', appId, userId, sessionId, etype, JSON.stringify(ctx), ts);
    }
  });
  insertMany();

  res.json({ message: 'Seeded 200 demo events' });
});

app.get('/health', (_req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM events').get();
  res.json({ status: 'ok', service: 'event-gateway', total_events: count.c });
});

app.listen(PORT, () => {
  console.log(`\n🟢 Event Gateway running on http://localhost:${PORT}`);
  console.log(`   Telemetry:  POST http://localhost:${PORT}/events`);
  console.log(`   Analytics:  GET  http://localhost:${PORT}/analytics/summary`);
  console.log(`   Mock API:   GET  http://localhost:${PORT}/mock/invoices\n`);
});
