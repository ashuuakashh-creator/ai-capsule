// ---------------------------------------------------------------------------
// SQLite database setup and access helpers.
//
// Uses better-sqlite3 (synchronous, no callbacks). The schema matches the one
// required by the assignment. Each capsule row is owned by a user_id that comes
// from the verified application JWT - never from the browser.
// ---------------------------------------------------------------------------

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATABASE_FILE = process.env.DATABASE_FILE || './data/ai-capsule.sqlite';

// Make sure the folder that holds the database file exists.
const dbPath = path.resolve(DATABASE_FILE);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Create the capsules table if it does not already exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS capsules (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          TEXT    NOT NULL,
    project_name     TEXT    NOT NULL,
    prompt_title     TEXT    NOT NULL,
    prompt_version   TEXT,
    prompt_text      TEXT    NOT NULL,
    response_summary TEXT,
    category         TEXT,
    usefulness       TEXT,
    reviewed         INTEGER DEFAULT 0,
    improved         INTEGER DEFAULT 0,
    screenshot_url   TEXT,
    notes            TEXT,
    created_at       TEXT    DEFAULT CURRENT_TIMESTAMP
  );
`);

// Speed up the common "list my records" query.
db.exec(`CREATE INDEX IF NOT EXISTS idx_capsules_user ON capsules (user_id);`);

// --- Prepared statements ---------------------------------------------------

const statements = {
  listByUser: db.prepare(
    `SELECT * FROM capsules WHERE user_id = ? ORDER BY datetime(created_at) DESC, id DESC`
  ),
  getByIdForUser: db.prepare(
    `SELECT * FROM capsules WHERE id = ? AND user_id = ?`
  ),
  insert: db.prepare(`
    INSERT INTO capsules (
      user_id, project_name, prompt_title, prompt_version, prompt_text,
      response_summary, category, usefulness, reviewed, improved,
      screenshot_url, notes
    ) VALUES (
      @user_id, @project_name, @prompt_title, @prompt_version, @prompt_text,
      @response_summary, @category, @usefulness, @reviewed, @improved,
      @screenshot_url, @notes
    )
  `),
  updateForUser: db.prepare(`
    UPDATE capsules SET
      project_name     = @project_name,
      prompt_title     = @prompt_title,
      prompt_version   = @prompt_version,
      prompt_text      = @prompt_text,
      response_summary = @response_summary,
      category         = @category,
      usefulness       = @usefulness,
      reviewed         = @reviewed,
      improved         = @improved,
      screenshot_url   = @screenshot_url,
      notes            = @notes
    WHERE id = @id AND user_id = @user_id
  `),
  deleteForUser: db.prepare(`DELETE FROM capsules WHERE id = ? AND user_id = ?`),
};

// --- Public API ------------------------------------------------------------

function listCapsules(userId) {
  return statements.listByUser.all(userId);
}

function getCapsule(id, userId) {
  return statements.getByIdForUser.get(id, userId);
}

function createCapsule(userId, data) {
  const row = normalise(userId, data);
  const info = statements.insert.run(row);
  return getCapsule(info.lastInsertRowid, userId);
}

// Returns the updated row, or null if no row was owned by this user.
function updateCapsule(id, userId, data) {
  const row = normalise(userId, data);
  row.id = id;
  const info = statements.updateForUser.run(row);
  if (info.changes === 0) return null;
  return getCapsule(id, userId);
}

// Returns true if a row was deleted, false if nothing was owned by this user.
function deleteCapsule(id, userId) {
  const info = statements.deleteForUser.run(id, userId);
  return info.changes > 0;
}

// Coerce incoming request data into the exact shape the SQL statements expect.
// Booleans (reviewed/improved) are stored as 0/1 integers.
function normalise(userId, data = {}) {
  return {
    user_id: String(userId),
    project_name: str(data.project_name),
    prompt_title: str(data.prompt_title),
    prompt_version: strOrNull(data.prompt_version),
    prompt_text: str(data.prompt_text),
    response_summary: strOrNull(data.response_summary),
    category: strOrNull(data.category),
    usefulness: strOrNull(data.usefulness),
    reviewed: toBit(data.reviewed),
    improved: toBit(data.improved),
    screenshot_url: strOrNull(data.screenshot_url),
    notes: strOrNull(data.notes),
  };
}

function str(v) {
  return v === undefined || v === null ? '' : String(v);
}
function strOrNull(v) {
  if (v === undefined || v === null || v === '') return null;
  return String(v);
}
function toBit(v) {
  if (v === true || v === 1 || v === '1' || v === 'Yes' || v === 'yes' || v === 'true') return 1;
  return 0;
}

module.exports = {
  db,
  listCapsules,
  getCapsule,
  createCapsule,
  updateCapsule,
  deleteCapsule,
};
