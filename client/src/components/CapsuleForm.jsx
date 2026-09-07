import { useState } from 'react';

const EMPTY = {
  project_name: '',
  prompt_title: '',
  prompt_version: '',
  prompt_text: '',
  response_summary: '',
  category: 'Coding',
  usefulness: 'Good',
  reviewed: false,
  improved: false,
  screenshot_url: '',
  notes: '',
};

// `initial` is a capsule row when editing, or null when creating.
export default function CapsuleForm({ initial, onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(() => hydrate(initial));
  const [error, setError] = useState('');

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.project_name.trim() || !form.prompt_title.trim() || !form.prompt_text.trim()) {
      setError('Project name, prompt title and prompt text are required.');
      return;
    }
    onSubmit(form);
  }

  return (
    <form className="capsule-form" onSubmit={handleSubmit}>
      <h2>{initial ? 'Edit prompt' : 'New prompt'}</h2>

      {error && <div className="alert">{error}</div>}

      <div className="grid2">
        <label>
          Project name *
          <input
            value={form.project_name}
            onChange={(e) => set('project_name', e.target.value)}
            placeholder="SmartFarm Irrigation"
            required
          />
        </label>
        <label>
          Prompt title *
          <input
            value={form.prompt_title}
            onChange={(e) => set('prompt_title', e.target.value)}
            placeholder="Debug cloud deployment"
            required
          />
        </label>
      </div>

      <div className="grid2">
        <label>
          Version
          <input
            value={form.prompt_version}
            onChange={(e) => set('prompt_version', e.target.value)}
            placeholder="v1"
          />
        </label>
        <label>
          Category
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option>Coding</option>
            <option>Writing</option>
            <option>Research</option>
            <option>Debugging</option>
            <option>Study</option>
            <option>Other</option>
          </select>
        </label>
      </div>

      <label>
        Prompt text *
        <textarea
          rows={4}
          value={form.prompt_text}
          onChange={(e) => set('prompt_text', e.target.value)}
          placeholder="Why does my Node server fail on Render?"
          required
        />
      </label>

      <label>
        Response summary
        <textarea
          rows={2}
          value={form.response_summary}
          onChange={(e) => set('response_summary', e.target.value)}
          placeholder="Check the start command and the PORT env var."
        />
      </label>

      <div className="grid2">
        <label>
          Usefulness
          <select value={form.usefulness} onChange={(e) => set('usefulness', e.target.value)}>
            <option>Good</option>
            <option>Needs Improvement</option>
          </select>
        </label>
        <label>
          Screenshot evidence (URL)
          <input
            value={form.screenshot_url}
            onChange={(e) => set('screenshot_url', e.target.value)}
            placeholder="https://..."
          />
        </label>
      </div>

      <div className="checks">
        <label className="check">
          <input
            type="checkbox"
            checked={!!form.reviewed}
            onChange={(e) => set('reviewed', e.target.checked)}
          />
          Reviewed
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={!!form.improved}
            onChange={(e) => set('improved', e.target.checked)}
          />
          Improved
        </label>
      </div>

      <label>
        Notes
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Reflection / comment. Tested and worked."
        />
      </label>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Create prompt'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function hydrate(initial) {
  if (!initial) return { ...EMPTY };
  return {
    project_name: initial.project_name || '',
    prompt_title: initial.prompt_title || '',
    prompt_version: initial.prompt_version || '',
    prompt_text: initial.prompt_text || '',
    response_summary: initial.response_summary || '',
    category: initial.category || 'Coding',
    usefulness: initial.usefulness || 'Good',
    reviewed: !!initial.reviewed,
    improved: !!initial.improved,
    screenshot_url: initial.screenshot_url || '',
    notes: initial.notes || '',
  };
}
