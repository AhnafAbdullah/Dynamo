require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.EVENT_GATEWAY_PORT || 3002;

// In-memory event log (Phase 1; replace with Kafka in Phase 2)
const eventLog = [];

// Mock data store for demo API endpoints
const mockInvoices = [
  { id: 'INV-001', client: 'Acme Corp',       amount: 4200,  status: 'paid',    due_date: '2026-05-01', notes: 'Q1 retainer' },
  { id: 'INV-002', client: 'Globex Inc',       amount: 8750,  status: 'pending', due_date: '2026-05-15', notes: 'Web redesign phase 1' },
  { id: 'INV-003', client: 'Initech Ltd',      amount: 1300,  status: 'overdue', due_date: '2026-04-20', notes: 'Consulting hours' },
  { id: 'INV-004', client: 'Umbrella Co',      amount: 22000, status: 'pending', due_date: '2026-05-30', notes: 'Annual SaaS license' },
  { id: 'INV-005', client: 'Massive Dynamic',  amount: 5500,  status: 'paid',    due_date: '2026-04-28', notes: 'R&D project milestone 2' },
  { id: 'INV-006', client: 'Bluth Company',    amount: 3100,  status: 'overdue', due_date: '2026-04-10', notes: 'Infrastructure setup' }
];

app.use(cors());
app.use(express.json({ limit: '1mb' }));

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
  if (idx === -1) return res.status(404).json({ error: 'Invoice not found' });
  mockInvoices[idx] = { ...mockInvoices[idx], ...req.body };
  res.json(mockInvoices[idx]);
});
app.delete('/mock/invoices/:id', (req, res) => {
  const idx = mockInvoices.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Invoice not found' });
  mockInvoices.splice(idx, 1);
  res.json({ message: 'Deleted' });
});

// ─── Telemetry Ingestion ──────────────────────────────────────────────────────
app.post('/events', (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  const enriched = events.map(e => ({
    event_id:   uuidv4(),
    tenant_id:  e.tenant_id  || 'default',
    app_id:     e.app_id     || 'unknown',
    user_id:    e.user_id    || 'anonymous',
    session_id: e.session_id || 'unknown',
    event_type: e.event_type || 'UNKNOWN',
    context:    e.context    || {},
    timestamp:  new Date().toISOString()
  }));

  eventLog.push(...enriched);

  // Keep last 10k events in memory
  if (eventLog.length > 10000) eventLog.splice(0, eventLog.length - 10000);

  res.status(202).json({ accepted: enriched.length });
});

// GET /events — retrieve recent events (for analytics dashboard Phase 2)
app.get('/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const app_id = req.query.app_id;
  let results = app_id ? eventLog.filter(e => e.app_id === app_id) : eventLog;
  res.json({ events: results.slice(-limit).reverse(), total: results.length });
});

// GET /events/summary — basic aggregation for Phase 2
app.get('/events/summary', (req, res) => {
  const app_id = req.query.app_id;
  const events = app_id ? eventLog.filter(e => e.app_id === app_id) : eventLog;
  const byType = events.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1;
    return acc;
  }, {});
  res.json({ total: events.length, by_type: byType });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'event-gateway', events_buffered: eventLog.length }));

app.listen(PORT, () => {
  console.log(`\n🟢 Event Gateway running on http://localhost:${PORT}`);
  console.log(`   Telemetry: POST http://localhost:${PORT}/events`);
  console.log(`   Mock API:  GET  http://localhost:${PORT}/mock/invoices\n`);
});
