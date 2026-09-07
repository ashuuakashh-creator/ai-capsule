import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="page landing">
      <header className="topbar">
        <div className="brand">🧠 AI Capsule</div>
        <nav>
          <Link className="btn btn-primary" to="/login">
            Sign in
          </Link>
        </nav>
      </header>

      <main className="hero">
        <h1>Keep your best AI prompts in one place.</h1>
        <p className="lead">
          AI Capsule is your private prompt library. Save the prompts that work,
          record which project and version they belong to, rate how useful they
          were, and review and improve them over time.
        </p>

        <div className="cta">
          <Link className="btn btn-primary btn-lg" to="/login">
            Sign in with GitHub to get started
          </Link>
        </div>

        <section className="features">
          <div className="feature">
            <h3>Save</h3>
            <p>Store the prompt, its project, version, category and your notes.</p>
          </div>
          <div className="feature">
            <h3>Review</h3>
            <p>Mark prompts as reviewed and track which ones you improved.</p>
          </div>
          <div className="feature">
            <h3>Private</h3>
            <p>You only ever see your own records. Sign in is required.</p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <span>AI Capsule &middot; CSE3CWA / CSE5006 Assignment 3</span>
      </footer>
    </div>
  );
}
