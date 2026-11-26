// AI assety z /assets (Higgsfield). Kým nie sú načítané (alebo chýbajú), kreslí sa procedurálna náhrada.
import { makeCanvas } from './util.js'

const SOURCES = {
  bg: { src: '/assets/bg.webp' },
  p0: { src: '/assets/player-0.png', sprite: true },
  p1: { src: '/assets/player-1.png', sprite: true },
  cpu: { src: '/assets/player-cpu.png', sprite: true },
  snowman: { src: '/assets/snowman.png', sprite: true },
}
const VIDEO_SRC = '/assets/bg.mp4'
const RETRY_MS = 5000
const MAX_RETRIES = 12
const SPRITE_MAX = 560 // sprity zmenšíme raz pri načítaní (rýchle kreslenie na mobile)
const ALPHA_MIN = 12
const BG_KEY = 232 // svetlé pozadie spojené s okrajom sa zmaže, ak obrázok nemá priehľadnosť

const loaded = {}
const browser = typeof document !== 'undefined'

// Ak obrázok nemá priehľadné rohy, zmaže svetlé pozadie (flood fill od okrajov)
function keyOutBackground(d, w, h) {
  const light = (i) => d[i + 3] > 0 && d[i] > BG_KEY && d[i + 1] > BG_KEY && d[i + 2] > BG_KEY
  const corners = [0, w - 1, (h - 1) * w, h * w - 1]
  if (!corners.every((p) => d[p * 4 + 3] > 250 && light(p * 4))) return
  const stack = new Int32Array(w * h)
  let sp = 0
  const push = (p) => {
    const i = p * 4
    if (!light(i)) return
    d[i + 3] = 0
    stack[sp++] = p
  }
  for (let x = 0; x < w; x++) push(x), push((h - 1) * w + x)
  for (let y = 0; y < h; y++) push(y * w), push(y * w + w - 1)
  while (sp) {
    const p = stack[--sp]
    const x = p % w
    if (x > 0) push(p - 1)
    if (x < w - 1) push(p + 1)
    if (p >= w) push(p - w)
    if (p < w * (h - 1)) push(p + w)
  }
}

// Zmenší, odstráni prípadné pozadie a oreže priehľadné okraje (nohy musia stáť na zemi)
function prepSprite(img) {
  const k = Math.min(1, SPRITE_MAX / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * k)
  const h = Math.round(img.naturalHeight * k)
  const c = makeCanvas(w, h, (g) => g.drawImage(img, 0, 0, w, h))
  const g = c.getContext('2d')
  let data
  try {
    data = g.getImageData(0, 0, w, h)
  } catch {
    return c
  }
  const d = data.data
  keyOutBackground(d, w, h)
  g.putImageData(data, 0, 0)
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] <= ALPHA_MIN) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < 0) return c
  return makeCanvas(x1 - x0 + 1, y1 - y0 + 1, (o) => o.drawImage(c, -x0, -y0))
}

function load(key, tries = 0) {
  const def = SOURCES[key]
  const img = new Image()
  img.decoding = 'async'
  img.onload = () => {
    const src = def.sprite ? prepSprite(img) : img
    loaded[key] = { img: src, w: src.width || img.naturalWidth, h: src.height || img.naturalHeight }
  }
  img.onerror = () => {
    if (tries < MAX_RETRIES) setTimeout(() => load(key, tries + 1), RETRY_MS)
  }
  img.src = tries ? `${def.src}?r=${tries}` : def.src
}

// Animované pozadie (8 s slučka). Ak chýba alebo zlyhá, ostane bg.webp.
let video = null
function loadVideo() {
  const v = document.createElement('video')
  Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto' })
  v.setAttribute('muted', '')
  v.setAttribute('playsinline', '')
  v.onerror = () => (video = null)
  v.src = VIDEO_SRC
  video = v
  const play = () => video?.play().catch(() => {})
  play()
  window.addEventListener('pointerdown', play, { passive: true })
  document.addEventListener('visibilitychange', () => !document.hidden && play())
}

if (browser) {
  Object.keys(SOURCES).forEach((k) => load(k))
  loadVideo()
}

export const asset = (key) => loaded[key] || null

// Sprity avatarov (pózy) sa načítajú lenivo podľa cesty – len pre avatary, ktoré sú práve v hre
const lazy = {}
export function spriteAt(src) {
  let e = lazy[src]
  if (!e) {
    e = lazy[src] = { v: null }
    if (browser) {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        const c = prepSprite(img)
        e.v = { img: c, w: c.width, h: c.height }
      }
      img.src = src
    }
  }
  return e.v
}

// Aktuálny frame videa, ak sa dá kresliť
export function bgVideo() {
  const v = video
  if (!v || v.error || v.paused || v.readyState < 2 || !v.videoWidth) return null
  return { img: v, w: v.videoWidth, h: v.videoHeight }
}
