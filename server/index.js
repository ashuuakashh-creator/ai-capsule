// ---------------------------------------------------------------------------
// AI Capsule - Express application entry point.
//
// Single-service setup: this one Express app serves BOTH the REST API and, in
// production, the built React frontend from the same public URL. That keeps
// the JWT cookie same-origin, so no CORS or cross-site cookie config is needed.
// ---------------------------------------------------------------------------

const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');

const config = require('./config');
const requireAuth = require('./middleware/requireAuth');
const authRoutes = require('./routes/auth');
const capsuleRoutes = require('./routes/capsules');

// Ensure the database (and its table) is initialised at startup.
require('./db');

const app = express();

// Behind Render's proxy; needed so Secure cookies are honoured over HTTPS.
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());

// --- Public: health check --------------------------------------------------
// Kept public so the deployed backend can be verified independently.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// --- Public: OAuth login / logout -----------------------------------------
app.use('/auth', authRoutes);

// --- Protected: current user info (used by the frontend to know who is in) --
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// --- Protected: capsule CRUD ----------------------------------------------
// requireAuth guards ALL of GET/POST/PUT/DELETE under /api/capsules.
app.use('/api/capsules', requireAuth, capsuleRoutes);

// Any other /api/* path that did not match is a JSON 404 (never HTML).
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// --- Serve the built React frontend in production -------------------------
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  // SPA fallback: send index.html for any non-API GET so React Router works
  // on deep links like /dashboard and /login.
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  // Helpful message during local API-only development (before building client).
  app.get('/', (req, res) => {
    res
      .type('text')
      .send(
        'AI Capsule API is running. The React client has not been built yet.\n' +
          "Run 'npm run build' to build it, or 'npm run dev:client' for the Vite dev server."
      );
  });
}

const port = config.port;
app.listen(port, () => {
  console.log(`AI Capsule server listening on http://localhost:${port}`);
  console.log(`  NODE_ENV = ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
