// ---------------------------------------------------------------------------
// Application JWT helpers.
//
// IMPORTANT: this is the *application* JWT issued by our Express backend after
// a successful GitHub OAuth login. It is NOT the GitHub access token. We sign
// it with JWT_SECRET and store it in a Secure, HttpOnly cookie named "token".
// ---------------------------------------------------------------------------

const jwt = require('jsonwebtoken');
const config = require('./config');

// Build the payload and sign the application JWT.
// `user` is the profile we derived from the OAuth provider.
function signAppJwt(user) {
  const payload = {
    sub: String(user.id), // the authenticated user_id (e.g. GitHub user ID)
    username: user.username || null,
    name: user.name || null,
    avatar: user.avatar || null,
    provider: user.provider || 'github',
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Verify a token string. Throws if invalid/expired.
function verifyAppJwt(token) {
  return jwt.verify(token, config.jwtSecret);
}

// Cookie options for the application JWT.
// - httpOnly: JavaScript in the browser cannot read it (mitigates XSS token theft)
// - secure:   only sent over HTTPS in production (Render serves HTTPS)
// - sameSite: "lax" is enough for the single-origin setup and survives the
//             top-level redirect back from GitHub.
function authCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

module.exports = { signAppJwt, verifyAppJwt, authCookieOptions };
