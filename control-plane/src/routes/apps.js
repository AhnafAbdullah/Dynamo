const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// GET /api/apps  — list all apps
router.get('/', (req, res) => {
  const apps = db.prepare('SELECT app_id, name, version, created_at, updated_at FROM apps').all();
  res.json({ apps });
});

// POST /api/apps  — create a new app
router.post('/', (req, res) => {
  const { name, config } = req.body;
  if (!name || !config) return res.status(400).json({ error: 'name and config are required' });

  const app_id = `app-${uuidv4().slice(0, 8)}`;
  db.prepare('INSERT INTO apps (app_id, name, config) VALUES (?, ?, ?)').run(
    app_id, name, JSON.stringify(config)
  );
  db.prepare('INSERT INTO app_versions (app_id, version, config) VALUES (?, 1, ?)').run(
    app_id, JSON.stringify(config)
  );

  res.status(201).json({ app_id, name, version: 1 });
});

// GET /api/apps/:appId  — get full app config
router.get('/:appId', (req, res) => {
  const app = db.prepare('SELECT * FROM apps WHERE app_id = ?').get(req.params.appId);
  if (!app) return res.status(404).json({ error: 'App not found' });
  app.config = JSON.parse(app.config);

  // Attach active experiments
  const experiments = db.prepare(
    "SELECT mutation_id, title, patch FROM mutations WHERE app_id = ? AND status = 'experimenting'"
  ).all(req.params.appId);
  app.experiments = experiments.map(e => ({ ...e, patch: JSON.parse(e.patch) }));

  res.json(app);
});

// PUT /api/apps/:appId  — full config replace (manual edit)
router.put('/:appId', (req, res) => {
  const { config } = req.body;
  if (!config) return res.status(400).json({ error: 'config is required' });

  const app = db.prepare('SELECT * FROM apps WHERE app_id = ?').get(req.params.appId);
  if (!app) return res.status(404).json({ error: 'App not found' });

  const newVersion = app.version + 1;
  db.prepare('UPDATE apps SET config = ?, version = ?, updated_at = datetime(\'now\') WHERE app_id = ?').run(
    JSON.stringify(config), newVersion, req.params.appId
  );
  db.prepare('INSERT INTO app_versions (app_id, version, config) VALUES (?, ?, ?)').run(
    req.params.appId, newVersion, JSON.stringify(config)
  );

  res.json({ message: 'App updated', version: newVersion });
});

// GET /api/apps/:appId/versions  — list all config versions
router.get('/:appId/versions', (req, res) => {
  const versions = db.prepare(
    'SELECT id, version, patch, created_at FROM app_versions WHERE app_id = ? ORDER BY version DESC'
  ).all(req.params.appId);
  res.json({ versions });
});

// GET /api/apps/:appId/versions/:version  — get a specific historical config
router.get('/:appId/versions/:version', (req, res) => {
  const row = db.prepare(
    'SELECT * FROM app_versions WHERE app_id = ? AND version = ?'
  ).get(req.params.appId, parseInt(req.params.version));
  if (!row) return res.status(404).json({ error: 'Version not found' });
  row.config = JSON.parse(row.config);
  res.json(row);
});

module.exports = router;
