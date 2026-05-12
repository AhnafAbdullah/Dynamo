const express = require('express');
const router = express.Router({ mergeParams: true });
const { v4: uuidv4 } = require('uuid');
const jsonpatch = require('jsonpatch');
const db = require('../db/database');

// GET /api/apps/:appId/mutations  — list all mutations for an app
router.get('/', (req, res) => {
  const mutations = db.prepare(
    'SELECT mutation_id, title, description, status, source, created_at, resolved_at FROM mutations WHERE app_id = ? ORDER BY created_at DESC'
  ).all(req.params.appId);
  res.json({ mutations });
});

// POST /api/apps/:appId/mutations  — submit a mutation request
router.post('/', (req, res) => {
  const { title, description, patch, source = 'ai' } = req.body;
  if (!title || !patch) return res.status(400).json({ error: 'title and patch are required' });

  // Validate the app exists
  const app = db.prepare('SELECT * FROM apps WHERE app_id = ?').get(req.params.appId);
  if (!app) return res.status(404).json({ error: 'App not found' });

  // Validate the patch is well-formed JSON and applies cleanly
  let parsedPatch;
  try {
    parsedPatch = typeof patch === 'string' ? JSON.parse(patch) : patch;
    jsonpatch.apply_patch(JSON.parse(app.config), parsedPatch); // dry-run validation
  } catch (err) {
    return res.status(400).json({ error: `Invalid JSON Patch: ${err.message}` });
  }

  const mutation_id = `mut-${uuidv4().slice(0, 8)}`;
  db.prepare(
    'INSERT INTO mutations (mutation_id, app_id, title, description, patch, source) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(mutation_id, req.params.appId, title, description || null, JSON.stringify(parsedPatch), source);

  res.status(201).json({ mutation_id, status: 'pending' });
});

// GET /api/apps/:appId/mutations/:mutationId/preview  — shadow-render: return what config WOULD look like
router.get('/:mutationId/preview', (req, res) => {
  const mutation = db.prepare('SELECT * FROM mutations WHERE mutation_id = ? AND app_id = ?').get(
    req.params.mutationId, req.params.appId
  );
  if (!mutation) return res.status(404).json({ error: 'Mutation not found' });

  const app = db.prepare('SELECT config FROM apps WHERE app_id = ?').get(req.params.appId);
  const currentConfig = JSON.parse(app.config);
  const patch = JSON.parse(mutation.patch);

  try {
    const previewConfig = jsonpatch.apply_patch(currentConfig, patch);
    res.json({ mutation_id: mutation.mutation_id, title: mutation.title, preview_config: previewConfig });
  } catch (err) {
    res.status(500).json({ error: `Patch application failed: ${err.message}` });
  }
});

// POST /api/apps/:appId/mutations/:mutationId/approve  — apply the patch to production
router.post('/:mutationId/approve', (req, res) => {
  const mutation = db.prepare('SELECT * FROM mutations WHERE mutation_id = ? AND app_id = ?').get(
    req.params.mutationId, req.params.appId
  );
  if (!mutation) return res.status(404).json({ error: 'Mutation not found' });
  if (mutation.status !== 'pending')
    return res.status(409).json({ error: `Mutation is already ${mutation.status}` });

  const app = db.prepare('SELECT * FROM apps WHERE app_id = ?').get(req.params.appId);
  const currentConfig = JSON.parse(app.config);
  const patch = JSON.parse(mutation.patch);

  let newConfig;
  try {
    newConfig = jsonpatch.apply_patch(currentConfig, patch);
  } catch (err) {
    return res.status(500).json({ error: `Patch application failed: ${err.message}` });
  }

  const newVersion = app.version + 1;

  // Atomic transaction: update app config + record version + mark mutation approved
  db.transaction(() => {
    db.prepare('UPDATE apps SET config = ?, version = ?, updated_at = datetime(\'now\') WHERE app_id = ?').run(
      JSON.stringify(newConfig), newVersion, req.params.appId
    );
    db.prepare('INSERT INTO app_versions (app_id, version, config, patch) VALUES (?, ?, ?, ?)').run(
      req.params.appId, newVersion, JSON.stringify(newConfig), mutation.patch
    );
    db.prepare('UPDATE mutations SET status = \'approved\', resolved_at = datetime(\'now\') WHERE mutation_id = ?').run(
      mutation.mutation_id
    );
  })();

  res.json({ message: 'Mutation approved and applied', version: newVersion });
});

// POST /api/apps/:appId/mutations/:mutationId/reject
router.post('/:mutationId/reject', (req, res) => {
  const result = db.prepare(
    'UPDATE mutations SET status = \'rejected\', resolved_at = datetime(\'now\') WHERE mutation_id = ? AND app_id = ? AND status = \'pending\''
  ).run(req.params.mutationId, req.params.appId);

  if (result.changes === 0) return res.status(404).json({ error: 'Pending mutation not found' });
  res.json({ message: 'Mutation rejected' });
});

module.exports = router;
