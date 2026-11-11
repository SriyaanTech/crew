import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { authenticator } from 'otplib'
import { q } from './db.js'
import { getConfig } from './config.js'
import { audit } from './audit.js'

const SECRET = process.env.JWT_SECRET || 'change-me'
if (process.env.NODE_ENV === 'production' && (SECRET.length < 32 || /change|dev-only/.test(SECRET))) {
  console.error('Refusing to start: set a long random JWT_SECRET in .env for production.')
  process.exit(1)
}
const TTL = process.env.JWT_EXPIRES_IN || '8h'
const ISSUER = process.env.MFA_ISSUER || 'CrewDesk'

const sign = (payload, expiresIn = TTL) => jwt.sign(payload, SECRET, { expiresIn })
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, mfa: !!u.mfa, scope: u.scope || 'All records' })
const publicCrewUser = (c) => ({ id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), email: c.email, role: 'Crew Member', crewId: c.id })

export const authRouter = Router()

authRouter.use('/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many login attempts. Try again in 15 minutes.' } }))

authRouter.post('/login', async (req, res) => {
  const { email = '', password = '', portal = 'staff' } = req.body || {}
  const login = String(email).trim()
  if (!login || !password) return res.status(400).json({ error: 'Email and password are required' })

  if (portal === 'crew') {
    const [c] = await q('SELECT * FROM crew WHERE (LOWER(email) = LOWER(?) OR UPPER(id) = UPPER(?)) LIMIT 1', [login, login])
    if (!c || !c.password_hash || !(await bcrypt.compare(password, c.password_hash))) return res.status(401).json({ error: 'Invalid Crew ID / email or password' })
    if (['Blacklisted', 'Inactive'].includes(c.status)) return res.status(403).json({ error: 'Your portal access is disabled. Please contact the crewing office.' })
    await audit({ name: publicCrewUser(c).name, role: 'Crew Member' }, 'LOGIN', 'auth', c.id, 'Crew portal')
    return res.json({ token: sign({ kind: 'crew', sub: c.id }), user: publicCrewUser(c) })
  }

  const [u] = await q('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [login])
  if (!u || !u.password_hash || !(await bcrypt.compare(password, u.password_hash))) return res.status(401).json({ error: 'Invalid email or password' })
  if (u.status !== 'Active') return res.status(403).json({ error: 'This account is suspended' })

  const settings = await getConfig('settings')
  if (u.mfa || settings.enforceMfa) {
    let secret = u.mfa_secret
    let setup = null
    if (!secret) {
      secret = authenticator.generateSecret()
      await q('UPDATE users SET mfa_secret = ? WHERE id = ?', [secret, u.id])
      setup = { setupKey: secret, otpauthUrl: authenticator.keyuri(u.email, ISSUER, secret) }
    }
    return res.json({ mfaRequired: true, email: u.email, mfaToken: sign({ kind: 'mfa', sub: u.id }, '10m'), ...(setup || {}) })
  }
  await q('UPDATE users SET last_login = CURDATE() WHERE id = ?', [u.id])
  await audit(publicUser(u), 'LOGIN', 'auth', u.id)
  res.json({ token: sign({ kind: 'staff', sub: u.id }), user: publicUser(u) })
})

authRouter.post('/mfa', async (req, res) => {
  const { mfaToken, code } = req.body || {}
  let p
  try { p = jwt.verify(mfaToken, SECRET) } catch { return res.status(401).json({ error: 'Verification expired. Please sign in again.' }) }
  if (p.kind !== 'mfa') return res.status(401).json({ error: 'Invalid verification request' })
  const [u] = await q('SELECT * FROM users WHERE id = ?', [p.sub])
  if (!u || !u.mfa_secret) return res.status(401).json({ error: 'Invalid verification request' })
  if (!authenticator.check(String(code || '').trim(), u.mfa_secret)) return res.status(401).json({ error: 'Incorrect code. Check the time on your phone and try again.' })
  await q('UPDATE users SET last_login = CURDATE() WHERE id = ?', [u.id])
  await audit(publicUser(u), 'LOGIN', 'auth', u.id, 'MFA')
  res.json({ token: sign({ kind: 'staff', sub: u.id }), user: publicUser(u) })
})

// ---- middleware ----
export async function requireAuth(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Not signed in' })
  let p
  try { p = jwt.verify(token, SECRET) } catch { return res.status(401).json({ error: 'Session expired' }) }
  if (p.kind === 'staff') {
    const [u] = await q('SELECT * FROM users WHERE id = ?', [p.sub])
    if (!u || u.status !== 'Active') return res.status(401).json({ error: 'Account disabled' })
    req.user = publicUser(u)
  } else if (p.kind === 'crew') {
    const [c] = await q('SELECT id, first_name, last_name, email, status FROM crew WHERE id = ?', [p.sub])
    if (!c || ['Blacklisted', 'Inactive'].includes(c.status)) return res.status(401).json({ error: 'Account disabled' })
    req.user = publicCrewUser(c)
  } else return res.status(401).json({ error: 'Invalid token' })
  next()
}

authRouter.get('/me', requireAuth, (req, res) => res.json({ user: req.user }))

authRouter.post('/logout', requireAuth, async (req, res) => {
  await audit(req.user, 'LOGOUT', 'auth', req.user.id)
  res.status(204).end()
})

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  const settings = await getConfig('settings')
  const err = passwordProblem(newPassword, settings)
  if (err) return res.status(400).json({ error: err })
  const table = req.user.role === 'Crew Member' ? 'crew' : 'users'
  const [row] = await q(`SELECT password_hash FROM ${table} WHERE id = ?`, [req.user.id])
  if (!row?.password_hash || !(await bcrypt.compare(currentPassword || '', row.password_hash))) return res.status(400).json({ error: 'Current password is incorrect' })
  await q(`UPDATE ${table} SET password_hash = ? WHERE id = ?`, [await bcrypt.hash(newPassword, 10), req.user.id])
  await audit(req.user, 'UPDATE', 'auth', req.user.id, 'password changed')
  res.status(204).end()
})

export function passwordProblem(pw, settings) {
  if (!pw) return 'Password is required'
  if (pw.length < (settings.passwordMinLength || 8)) return `Password must be at least ${settings.passwordMinLength || 8} characters`
  if (settings.passwordRequireSymbols && !(/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw))) return 'Password must include a number and a symbol'
  return null
}
