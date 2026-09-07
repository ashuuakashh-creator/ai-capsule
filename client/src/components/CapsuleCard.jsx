export default function CapsuleCard({ capsule, onEdit, onDelete }) {
  return (
    <article className="capsule">
      <div className="capsule-head">
        <div>
          <h3>{capsule.prompt_title}</h3>
          <div className="capsule-meta">
            <span className="tag">{capsule.project_name}</span>
            {capsule.prompt_version && <span className="tag ghost">{capsule.prompt_version}</span>}
            {capsule.category && <span className="tag ghost">{capsule.category}</span>}
          </div>
        </div>
        <div className="capsule-actions">
          <button className="btn btn-sm" onClick={() => onEdit(capsule)}>
            Edit
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => onDelete(capsule)}>
            Delete
          </button>
        </div>
      </div>

      <p className="prompt-text">{capsule.prompt_text}</p>

      {capsule.response_summary && (
        <p className="summary">
          <strong>Response:</strong> {capsule.response_summary}
        </p>
      )}

      <div className="badges">
        {capsule.usefulness && (
          <span className={`badge ${capsule.usefulness === 'Good' ? 'good' : 'warn'}`}>
            {capsule.usefulness}
          </span>
        )}
        <span className={`badge ${capsule.reviewed ? 'good' : 'muted'}`}>
          {capsule.reviewed ? 'Reviewed' : 'Not reviewed'}
        </span>
        <span className={`badge ${capsule.improved ? 'good' : 'muted'}`}>
          {capsule.improved ? 'Improved' : 'Not improved'}
        </span>
      </div>

      {capsule.screenshot_url && (
        <a className="link small" href={capsule.screenshot_url} target="_blank" rel="noreferrer">
          View screenshot evidence ↗
        </a>
      )}

      {capsule.notes && <p className="notes">📝 {capsule.notes}</p>}

      {capsule.created_at && (
        <div className="created">Created: {capsule.created_at}</div>
      )}
    </article>
  );
}
