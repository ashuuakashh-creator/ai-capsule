// Central place to read and validate environment configuration.
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

const config = {
  isProd,
  port: process.env.PORT || 3000,

  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  },
  oauthCallbackUrl:
    process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
  postLoginRedirect: process.env.POST_LOGIN_REDIRECT || '/dashboard',

  cookieName: 'token', // required by the assignment: cookie MUST be named "token"
};

// The name of the OAuth cookie used to carry the CSRF "state" value between
// the authorize redirect and the callback.
config.stateCookieName = 'oauth_state';

// Warn (but do not crash) if OAuth credentials are missing, so /api/health and
// the cURL 401 checks still work even before OAuth is configured.
if (!config.github.clientId || !config.github.clientSecret) {
  console.warn(
    '[config] GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET are not set. ' +
      'OAuth login will not work until you configure them.'
  );
}
if (config.jwtSecret === 'dev-only-insecure-secret-change-me') {
  console.warn('[config] JWT_SECRET is not set. Using an insecure development default.');
}

module.exports = config;
