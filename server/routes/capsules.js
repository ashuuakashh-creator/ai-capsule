// ---------------------------------------------------------------------------
// Protected capsule CRUD API.
//
// Every route in this router is behind requireAuth (mounted in index.js), so
// req.user is always set and comes from the verified application JWT. The
// user_id is taken from req.user.id and is NEVER read from the request body.
//
//   GET    /api/capsules      -> list the authenticated user's records
//   POST   /api/capsules      -> create a record owned by the authenticated user
//   PUT    /api/capsules/:id   -> update one of the user's own records
//   DELETE /api/capsules/:id   -> delete one of the user's own records
// ---------------------------------------------------------------------------

const express = require('express');
const store = require('../db');

const router = express.Router();

// READ: list only the authenticated user's records.
router.get('/', (req, res) => {
  const rows = store.listCapsules(req.user.id);
  res.json(rows);
});

// CREATE: save a new record owned by the authenticated user.
router.post('/', (req, res) => {
  const errors = validate(req.body);
  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  const created = store.createCapsule(req.user.id, req.body);
  res.status(201).json(created);
});

// UPDATE: change one of the user's own records.
// updateCapsule only touches rows WHERE user_id = req.user.id, so a user can
// never modify another user's record (they get 404 instead).
router.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });

  const errors = validate(req.body);
  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const updated = store.updateCapsule(id, req.user.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json(updated);
});

// DELETE: remove one of the user's own records.
router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });

  const deleted = store.deleteCapsule(id, req.user.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json({ ok: true, id });
});

// --- helpers ---------------------------------------------------------------

// The three NOT NULL text columns must be present and non-empty.
function validate(body = {}) {
  const errors = [];
  if (!isNonEmpty(body.project_name)) errors.push('project_name is required');
  if (!isNonEmpty(body.prompt_title)) errors.push('prompt_title is required');
  if (!isNonEmpty(body.prompt_text)) errors.push('prompt_text is required');
  return errors;
}

function isNonEmpty(v) {
  return typeof v === 'string' ? v.trim().length > 0 : v !== undefined && v !== null;
}

function parseId(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

module.exports = router;
