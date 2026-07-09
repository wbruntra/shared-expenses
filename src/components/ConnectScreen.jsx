import { useState } from 'preact/hooks'
import { getConnection } from '../lib/json-drop-store.js'

export function ConnectScreen({ onConnect, onCancel, error }) {
  const existing = getConnection()
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl || '')
  const [projectId, setProjectId] = useState(existing?.projectId || '')
  const [token, setToken] = useState(existing?.token || '')

  function handleSubmit(e) {
    e.preventDefault()
    onConnect({
      baseUrl: baseUrl.trim(),
      projectId: projectId.trim(),
      token: token.trim(),
    })
  }

  return (
    <section class="panel connect-screen">
      <h2>Connect to json-drop</h2>
      <p class="hint">
        Enter your json-drop server details to sync shared expense files across
        devices. The project ID lets anyone read public files; the token is
        needed to create or edit files.
      </p>
      <form class="form" onSubmit={handleSubmit}>
        <label class="field">
          <span>Server URL</span>
          <input
            type="url"
            placeholder="https://your-jsondrop-server.com"
            value={baseUrl}
            onInput={(e) => setBaseUrl(e.currentTarget.value)}
            required
          />
        </label>
        <label class="field">
          <span>Project ID</span>
          <input
            type="text"
            placeholder="6nYhRKKDwkbk..."
            value={projectId}
            onInput={(e) => setProjectId(e.currentTarget.value)}
            required
          />
        </label>
        <label class="field">
          <span>API token (optional, needed to edit)</span>
          <input
            type="password"
            placeholder="jd_…"
            value={token}
            onInput={(e) => setToken(e.currentTarget.value)}
          />
        </label>
        {error && <div class="error">{error}</div>}
        <div class="form-actions">
          {onCancel && (
            <button type="button" class="secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit">Connect</button>
        </div>
      </form>
      <p class="hint connection-privacy">
        Your credentials are stored only in this browser's localStorage and are
        sent directly to your json-drop server.
      </p>
    </section>
  )
}