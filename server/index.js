// API pre Vianočnú guľovačku: WebSocket miestnosti (/api/ws) + REST súťaž a rebríček.
import http from 'node:http'
import { randomInt, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { WebSocketServer } from 'ws'
import { HITS_TO_WIN, LEADERBOARD_SIZE } from '../src/config.js'

const PORT = process.env.PORT || 3000
const DATA_DIR = new URL('./data/', import.meta.url)
const DATA_FILE = new URL('entries.json', DATA_DIR)
const TMP_FILE = new URL('entries.json.tmp', DATA_DIR)
const MAX_ENTRIES = 20000 // strop proti spamu, aby súbor a pamäť nerástli donekonečna
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const MAX_BODY = 10 * 1024
const MAX_LEN = 60
const MODES = ['cpu', 'vs']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HEARTBEAT_MS = 20000
const ROOM_ERROR = 'Miestnosť neexistuje alebo je plná'

// ---------- REST ----------

const sendJson = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(data))
}

// Záznamy súťaže: v pamäti, append-only, na disk atomicky (tmp + rename).
// Poškodený súbor sa nikdy neprepíše prázdnym poľom, odloží sa bokom na ručnú obnovu.
async function loadEntries() {
  try {
    const data = JSON.parse(await readFile(DATA_FILE, 'utf8'))
    if (Array.isArray(data)) return data
  } catch (err) {
    if (err.code === 'ENOENT') return []
  }
  await rename(DATA_FILE, new URL(`entries.corrupt-${Date.now()}.json`, DATA_DIR)).catch(() => {})
  console.error('entries.json bol poškodený, odložený bokom')
  return []
}
const entries = await loadEntries()

let saving = Promise.resolve()
function addEntry(entry) {
  entries.push(entry)
  const write = saving.then(async () => {
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(TMP_FILE, JSON.stringify(entries))
    await rename(TMP_FILE, DATA_FILE)
  })
  saving = write.catch((err) => console.error('Zápis záznamov zlyhal', err)) // chyba nezablokuje ďalšie zápisy
  return write
}
const emailKey = (e) => String(e.email ?? '').toLowerCase()

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Príliš veľké telo požiadavky'), { status: 413 }))
        req.destroy()
      } else chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(Object.assign(new Error('Neplatný JSON'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

const isStr = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_LEN
const isHits = (v) => Number.isInteger(v) && v >= 0 && v <= HITS_TO_WIN
// výsledok musí sedieť so skóre: obaja nemôžu mať 5, víťaz nemá menej ako porazený
const isConsistent = ({ won, score: [mine, theirs] }) =>
  !(mine === HITS_TO_WIN && theirs === HITS_TO_WIN) && (won ? mine >= theirs : mine <= theirs)

function validateEntry(b) {
  if (!isStr(b.name)) return 'Neplatné meno'
  if (!isStr(b.email) || !EMAIL_RE.test(b.email.trim())) return 'Neplatný e-mail'
  if (!MODES.includes(b.mode)) return 'Neplatný režim'
  if (typeof b.won !== 'boolean') return 'Neplatný výsledok'
  if (!Array.isArray(b.score) || b.score.length !== 2 || !b.score.every(isHits)) return 'Neplatné skóre'
  if (!isConsistent(b)) return 'Výsledok nesedí so skóre'
  if (typeof b.accuracy !== 'number' || !(b.accuracy >= 0 && b.accuracy <= 1)) return 'Neplatná presnosť'
  return null
}

const byRank = (a, b) =>
  Number(b.won) - Number(a.won) || b.score[0] - b.score[1] - (a.score[0] - a.score[1]) || b.accuracy - a.accuracy

const routes = {
  'GET /api/health': async () => ({ ok: true }),

  'POST /api/entries': async (req) => {
    const body = await readBody(req)
    const error = validateEntry(body)
    if (error) throw Object.assign(new Error(error), { status: 400 })
    if (entries.length >= MAX_ENTRIES) throw Object.assign(new Error('Súťaž je plná'), { status: 503 })
    const entry = {
      id: randomUUID(),
      ts: Date.now(),
      name: body.name.trim(),
      email: body.email.trim(),
      mode: body.mode,
      won: body.won,
      score: body.score,
      accuracy: body.accuracy,
    }
    await addEntry(entry)
    return { id: entry.id }
  },

  'GET /api/leaderboard': async (req, url) => {
    const mode = url.searchParams.get('mode')
    if (!MODES.includes(mode)) throw Object.assign(new Error('Neplatný režim'), { status: 400 })
    const seen = new Set() // v rebríčku len najlepší výsledok na e-mail
    return entries
      .filter((e) => e.mode === mode)
      .sort(byRank)
      .filter((e) => !seen.has(emailKey(e)) && seen.add(emailKey(e)))
      .slice(0, LEADERBOARD_SIZE)
      .map(({ name, score, accuracy, won, ts }) => ({ name, score, accuracy, won, ts }))
  },
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const handler = routes[`${req.method} ${url.pathname.replace(/\/+$/, '')}`]
  if (!handler) return sendJson(res, 404, { error: 'Nenájdené' })
  try {
    sendJson(res, 200, await handler(req, url))
  } catch (err) {
    sendJson(res, err.status || 500, { error: err.status ? err.message : 'Chyba servera' })
    if (!err.status) console.error(err)
  }
})

// ---------- WebSocket miestnosti ----------

const rooms = new Map() // kód → { seed, players: [ws, ws?] }
const wss = new WebSocketServer({ server, path: '/api/ws', maxPayload: MAX_BODY })

const send = (ws, msg) => ws?.readyState === 1 && ws.send(JSON.stringify(msg))
const cleanName = (n) => (typeof n === 'string' && n.trim().slice(0, MAX_LEN)) || 'Hráč'

function newCode() {
  let code
  do code = Array.from({ length: 4 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('')
  while (rooms.has(code))
  return code
}

function leave(ws) {
  const room = rooms.get(ws.room)
  if (!room) return
  rooms.delete(ws.room)
  room.players.forEach((p) => {
    if (p === ws) return
    p.room = null
    send(p, { t: 'left' })
  })
  ws.room = null
}

const handlers = {
  create(ws, msg) {
    leave(ws)
    const room = newCode()
    const seed = randomInt(1e9)
    ws.name = cleanName(msg.name)
    ws.room = room
    rooms.set(room, { seed, players: [ws] })
    send(ws, { t: 'created', room, seed, me: 0 })
  },

  join(ws, msg) {
    const code = String(msg.room || '').trim().toUpperCase()
    const room = rooms.get(code)
    if (!room || room.players.length !== 1 || room.players[0] === ws) return send(ws, { t: 'error', message: ROOM_ERROR })
    leave(ws)
    ws.name = cleanName(msg.name)
    ws.room = code
    room.players.push(ws)
    const names = room.players.map((p) => p.name)
    send(ws, { t: 'joined', room: code, seed: room.seed, me: 1, names })
    room.players.forEach((p) => send(p, { t: 'start', seed: room.seed, names }))
  },

  throw(ws, msg) {
    const room = rooms.get(ws.room)
    const angle = Number(msg.angle)
    const power = Number(msg.power)
    if (!room || !Number.isFinite(angle) || !Number.isFinite(power)) return
    room.players.forEach((p) => p !== ws && send(p, { t: 'throw', angle, power }))
  },
}

wss.on('connection', (ws) => {
  ws.isAlive = true
  ws.on('pong', () => (ws.isAlive = true))
  ws.on('message', (data) => {
    let msg
    try {
      msg = JSON.parse(data)
    } catch {
      return
    }
    if (Object.hasOwn(handlers, msg?.t)) handlers[msg.t](ws, msg)
  })
  ws.on('close', () => leave(ws))
  ws.on('error', () => ws.terminate())
})

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate()
    ws.isAlive = false
    ws.ping()
  })
}, HEARTBEAT_MS)
wss.on('close', () => clearInterval(heartbeat))

server.listen(PORT, () => console.log(`API beží na porte ${PORT}`))
