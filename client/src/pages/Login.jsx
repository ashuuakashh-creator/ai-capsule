import { Link } from 'react-router-dom';

export default function Login() {
  // Starting OAuth is a full-page navigation to the Express backend, not a
  // fetch call - the browser needs to follow the redirect to GitHub.
  function startGithubLogin() {
    window.location.href = '/auth/github';
  }

  return (
    <div className="page centered">
      <div className="card auth-card">
        <div className="brand big">🧠 AI Capsule</div>
        <h1>Sign in</h1>
        <p className="muted">
          Sign in with your GitHub account to open your private prompt library.
        </p>

        <button className="btn btn-github btn-lg" onClick={startGithubLogin}>
          <span className="gh-mark" aria-hidden="true">
            {'\u{1F419}'}
          </span>
          Continue with GitHub
        </button>

        <p className="muted small">
          We only read your public GitHub profile to identify your account.
        </p>

        <Link className="link" to="/">
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
