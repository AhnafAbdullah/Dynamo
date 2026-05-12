require('dotenv').config();
const express = require('express');
const cors = require('cors');
const appsRouter = require('./routes/apps');
const mutationsRouter = require('./routes/mutations');

const app = express();
const PORT = process.env.CONTROL_PLANE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/apps', appsRouter);
app.use('/api/apps', mutationsRouter); // mutations are nested: /api/apps/:appId/mutations

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'control-plane' }));

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🟢 Control Plane API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Apps:   http://localhost:${PORT}/api/apps\n`);
});
