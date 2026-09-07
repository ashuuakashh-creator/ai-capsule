import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import CapsuleForm from '../components/CapsuleForm.jsx';
import CapsuleCard from '../components/CapsuleCard.jsx';

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // capsule being edited, or null
  const [busy, setBusy] = useState(false);

  // If any call returns 401, the session is gone -> go to login.
  const handleAuthError = useCallback(
    (err) => {
      if (err && err.status === 401) {
        navigate('/login', { replace: true });
        return true;
      }
      return false;
    },
    [navigate]
  );

  const loadCapsules = useCallback(async () => {
    const rows = await api.listCapsules();
    setCapsules(rows);
  }, []);

  // Initial load: confirm the session, then fetch records.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.me();
        if (cancelled) return;
        setUser(me.user);
        await loadCapsules();
      } catch (err) {
        if (handleAuthError(err)) return;
        setError(err.message || 'Something went wrong.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handleAuthError, loadCapsules]);

  async function handleCreate(data) {
    setBusy(true);
    setError('');
    try {
      await api.createCapsule(data);
      await loadCapsules();
      setShowForm(false);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(data) {
    setBusy(true);
    setError('');
    try {
      await api.updateCapsule(editing.id, data);
      await loadCapsules();
      setEditing(null);
      setShowForm(false);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(capsule) {
    if (!window.confirm(`Delete "${capsule.prompt_title}"? This cannot be undone.`)) return;
    setError('');
    try {
      await api.deleteCapsule(capsule.id);
      setCapsules((cs) => cs.filter((c) => c.id !== capsule.id));
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(err.message);
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    navigate('/login', { replace: true });
  }

  function startCreate() {
    setEditing(null);
    setShowForm(true);
  }
  function startEdit(capsule) {
    setEditing(capsule);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function cancelForm() {
    setEditing(null);
    setShowForm(false);
  }

  if (loading) {
    return (
      <div className="page centered">
        <div className="muted">Loading your prompt library…</div>
      </div>
    );
  }

  return (
    <div className="page dashboard">
      <header className="topbar">
        <div className="brand">🧠 AI Capsule</div>
        <div className="userbox">
          {user && user.avatar && (
            <img className="avatar" src={user.avatar} alt="" width="28" height="28" />
          )}
          {user && <span className="username">{user.name || user.username}</span>}
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="content">
        <div className="content-head">
          <h1>Your prompts</h1>
          {!showForm && (
            <button className="btn btn-primary" onClick={startCreate}>
              + New prompt
            </button>
          )}
        </div>

        {error && <div className="alert">{error}</div>}

        {showForm && (
          <div className="card">
            <CapsuleForm
              initial={editing}
              busy={busy}
              onSubmit={editing ? handleUpdate : handleCreate}
              onCancel={cancelForm}
            />
          </div>
        )}

        {capsules.length === 0 && !showForm ? (
          <div className="empty">
            <p>You have no saved prompts yet.</p>
            <button className="btn btn-primary" onClick={startCreate}>
              Create your first prompt
            </button>
          </div>
        ) : (
          <div className="capsule-list">
            {capsules.map((c) => (
              <CapsuleCard key={c.id} capsule={c} onEdit={startEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
