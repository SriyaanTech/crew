import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import multer from 'multer'
import { pool } from './db.js'
import { authRouter, requireAuth } from './auth.js'
import { crudRouter, actionRouter } from './crud.js'
import { getConfig, setConfig, can, CONFIG_KEYS } from './config.js'
import { audit } from './audit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const UPLOAD_DIR = path.resolve(ROOT, process.env.UPLOAD_DIR || 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const app = express()
app.set('trust proxy', 1)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }))

const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean)
app.use(cors({ origin: (origin, cb) => cb(null, !origin || origins.includes('*') || origins.includes(origin)), credentials: false }))
app.use(express.json({ limit: '2mb' }))

// ---- public ----
app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, db: 'connected' }) } catch (e) { res.status(500).json({ ok: false, db: e.message }) }
})
app.use('/api/auth', authRouter)

// Uploaded files are stored with random, unguessable names
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1d', index: false }))

// ---- authenticated ----
app.use('/api', requireAuth)

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase().slice(0, 8)}`),
  }),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /\.(pdf|png|jpe?g|webp|gif|doc|docx|xls|xlsx)$/i.test(file.originalname)),
})
app.post('/api/uploads', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File missing or type not allowed (PDF, images, Word, Excel)' })
  const base = (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
  res.status(201).json({ fileName: req.file.originalname, url: `${base}/uploads/${req.file.filename}` })
})

app.get('/api/config/:key', async (req, res) => {
  if (!CONFIG_KEYS.includes(req.params.key)) return res.status(404).json({ error: 'Unknown config' })
  res.json(await getConfig(req.params.key))
})
app.put('/api/config/:key', async (req, res) => {
  const key = req.params.key
  if (!CONFIG_KEYS.includes(key)) return res.status(404).json({ error: 'Unknown config' })
  const module = key === 'permissions' ? 'users' : 'settings'
  if (!(await can(req.user, module, 'edit'))) return res.status(403).json({ error: 'Not allowed' })
  if (key === 'permissions') req.body['Super Admin'] = (await getConfig('permissions'))['Super Admin'] // cannot lock out Super Admin
  const saved = await setConfig(key, req.body)
  await audit(req.user, 'UPDATE', 'config', key, 'configuration')
  res.json(saved)
})

app.use('/api', actionRouter)
app.use('/api', crudRouter)

// Optional: serve the built frontend from the same server (set FRONTEND_DIST=../frontend/dist)
if (process.env.FRONTEND_DIST) {
  const dist = path.resolve(ROOT, process.env.FRONTEND_DIST)
  app.use(express.static(dist))
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

// ---- errors ----
app.use((err, _req, res, _next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500)
  if (status >= 500) console.error(err)
  const msg = status >= 500 && process.env.NODE_ENV === 'production' ? 'Server error' : err.sqlMessage || err.message
  res.status(status).json({ error: msg })
})

const PORT = Number(process.env.PORT || 8000)
app.listen(PORT, () => console.log(`CrewDesk API listening on http://localhost:${PORT}/api  (CORS: ${origins.join(', ')})`))
