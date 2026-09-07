// ---------------------------------------------------------------------------
// GitHub OAuth login flow + logout.
//
// Flow:
//   1. GET /auth/github          -> redirect the browser to GitHub's authorize
//                                   page (with a random CSRF "state").
//   2. GET /auth/github/callback -> GitHub redirects back with ?code&state.
//                                   We verify state, exchange the code for a
//                                   GitHub access token, fetch the GitHub user,
//                                   then issue OUR application JWT and store it
//                                   in the HttpOnly "token" cookie.
//   3. POST /auth/logout         -> clear the cookie.
//
// Note: the GitHub access token is used only server-side to read the user's
// profile. It is never sent to the browser. The browser only ever holds the
// application JWT in the "token" cookie.
// ---------------------------------------------------------------------------

const crypto = require('crypto');
const express = require('express');
const config = require('../config');
const { signAppJwt, authCookieOptions } = require('../jwt');

const router = express.Router();

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

// Short-lived cookie options for the CSRF state value.
function stateCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60 * 1000, // 10 minutes
  };
}

// Step 1: start the OAuth login.
router.get('/github', (req, res) => {
  if (!config.github.clientId) {
    return res
      .status(500)
      .send('GitHub OAuth is not configured (missing GITHUB_CLIENT_ID).');
  }

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(config.stateCookieName, state, stateCookieOptions());

  const params = new URLSearchParams({
    client_id: config.github.clientId,
    redirect_uri: config.oauthCallbackUrl,
    scope: 'read:user',
    state,
    allow_signup: 'true',
  });

  res.redirect(`${GITHUB_AUTHORIZE_URL}?${params.toString()}`);
});

// Step 2: OAuth callback.
router.get('/github/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const savedState = req.cookies && req.cookies[config.stateCookieName];

    // Clear the one-time state cookie regardless of outcome.
    res.clearCookie(config.stateCookieName, { path: '/' });

    if (!code) {
      return res.status(400).send('OAuth error: missing authorization code.');
    }
    if (!state || !savedState || state !== savedState) {
      return res.status(400).send('OAuth error: invalid state (possible CSRF).');
    }

    // Exchange the code for a GitHub access token.
    const tokenResp = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.github.clientId,
        client_secret: config.github.clientSecret,
        code,
        redirect_uri: config.oauthCallbackUrl,
      }),
    });
    const tokenData = await tokenResp.json();

    if (!tokenData.access_token) {
      return res
        .status(401)
        .send('OAuth error: could not obtain access token from GitHub.');
    }

    // Fetch the authenticated GitHub user's profile.
    const userResp = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ai-capsule',
      },
    });

    if (!userResp.ok) {
      return res.status(401).send('OAuth error: could not fetch GitHub profile.');
    }
    const ghUser = await userResp.json();

    // Build the profile we care about. The GitHub numeric "id" is our user_id.
    const user = {
      id: ghUser.id,
      username: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatar: ghUser.avatar_url || null,
      provider: 'github',
    };

    // Issue OUR application JWT and store it in the HttpOnly "token" cookie.
    const appJwt = signAppJwt(user);
    res.cookie(config.cookieName, appJwt, authCookieOptions());

    // Send the user to the protected dashboard.
    return res.redirect(config.postLoginRedirect);
  } catch (err) {
    console.error('[oauth] callback failed:', err);
    return res.status(500).send('OAuth error: login failed. Please try again.');
  }
});

// Logout: clear the application JWT cookie.
router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, { path: '/' });
  res.json({ ok: true });
});

module.exports = router;
