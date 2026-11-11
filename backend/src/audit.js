import { q } from './db.js'

export async function audit(user, action, resource, recordId, detail = '') {
  try {
    const [{ n }] = await q('SELECT COUNT(*) AS n FROM audit_log')
    const id = `AUD-${String(n + 1).padStart(6, '0')}-${Date.now().toString(36)}`
    await q('INSERT INTO audit_log (id, `at`, `user`, `action`, `resource`, `record_id`, `detail`) VALUES (?, UTC_TIMESTAMP(), ?, ?, ?, ?, ?)',
      [id, user ? `${user.name} (${user.role})` : 'System', action, resource, recordId || '-', String(detail).slice(0, 2000)])
  } catch (e) {
    console.error('audit failed', e.message)
  }
}
