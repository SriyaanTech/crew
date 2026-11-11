import { q } from './db.js'
import { DEFAULT_PERMISSIONS, defaultSettings } from './permissions.js'

const DEFAULTS = { permissions: () => DEFAULT_PERMISSIONS, settings: defaultSettings }
export const CONFIG_KEYS = Object.keys(DEFAULTS)

export async function getConfig(key) {
  const rows = await q('SELECT `value` FROM app_config WHERE config_key = ?', [key])
  if (rows.length) { try { return JSON.parse(rows[0].value) } catch { /* fall through */ } }
  return DEFAULTS[key]()
}

export async function setConfig(key, value) {
  await q('INSERT INTO app_config (config_key, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [key, JSON.stringify(value)])
  return value
}

export async function can(user, module, action) {
  if (!user || user.role === 'Crew Member') return false
  if (user.role === 'Super Admin') return true
  const matrix = await getConfig('permissions')
  return (matrix[user.role]?.[module] || []).includes(action)
}
