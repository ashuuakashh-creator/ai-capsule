// ---------------------------------------------------------------------------
// JWT authentication middleware.
//
// Reads the application JWT from the HttpOnly cookie named "token", verifies it
// with JWT_SECRET, and attaches the authenticated user to req.user.
//
// Any request with no token OR an invalid/expired token gets 401 Unauthorized
// and never reaches the protected route handler. This is what makes the two
// required cURL checks pass:
//   1. no cookie        -> 401
//   2. token=fake-...   -> 401 (jwt.verify throws on a bad signature)
// ---------------------------------------------------------------------------

const config = require('../config');
const { verifyAppJwt } = require('../jwt');

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[config.cookieName];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: no authentication token' });
  }

  try {
    const decoded = verifyAppJwt(token);
    // The user_id used for all CRUD ownership comes from the verified JWT,
    // NOT from the request body or query string.
    req.user = {
      id: decoded.sub,
      username: decoded.username,
      name: decoded.name,
      avatar: decoded.avatar,
      provider: decoded.provider,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
}

module.exports = requireAuth;
