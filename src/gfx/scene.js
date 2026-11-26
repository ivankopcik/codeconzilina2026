// Scéna: pozadie (video → obrázok → procedurálna náhrada), snehová zem, sneženie.
import { WORLD, COLORS } from '../config.js'
import { asset, bgVideo } from './assets.js'
import { makeCanvas, circle, rand, TAU, glow, rgba, poly, starPath } from './util.js'

const { W, H, GROUND_Y } = WORLD
const BG_ZOOM = 1.04
const BG_DRIFT = { x: 14, y: 5, speed: 0.08 }
const BG_PARALLAX = 0.5 // pozadie sa pri otrase hýbe menej → hĺbka
const MARGIN = 30 // presah kvôli otrasu kamery
const GROUND_TOP = GROUND_Y - 8
const HAZE = 60 // opar nad zemou, zjemní prechod do pozadia
const GLINTS = 16

// --- procedurálne pozadie (len keď nie je video ani obrázok) ---
const AURORA = [
  { y: 170, amp: 40, th: 70, f: 0.004, color: '#2ee6a0' },
  { y: 240, amp: 30, th: 50, f: 0.006, color: '#2ec4b6' },
  { y: 130, amp: 25, th: 40, f: 0.005, color: '#8a6cff' },
]

function ridge(g, base, amp, f, seed, color) {
  g.fillStyle = color
  g.beginPath()
  g.moveTo(0, GROUND_Y)
  for (let x = 0; x <= W; x += 32) g.lineTo(x, base - Math.abs(Math.sin(x * f + seed)) * amp - Math.sin(x * f * 2.7) * amp * 0.25)
  g.lineTo(W, GROUND_Y)
  g.fill()
}

function fir(g, x, h) {
  const base = GROUND_Y - 4
  for (let k = 0; k < 3; k++) {
    const y = base - h * (0.15 + k * 0.28)
    const w = h * (0.42 - k * 0.1)
    poly(g, [[x - w, y + h * 0.18], [x + w, y + h * 0.18], [x, y - h * 0.32]], '#0c1836')
  }
  for (let k = 0; k < 5; k++) {
    const ly = base - h * rand(0.15, 0.85)
    const lx = x + rand(-0.25, 0.25) * h * (1 - (base - ly) / h)
    glow(g, lx, ly, 9, COLORS.gold, { alpha: 0.9 })
    circle(g, lx, ly, 2.2, '#fff3c4')
  }
}

function paintSky(g) {
  const sky = g.createLinearGradient(0, 0, 0, GROUND_Y)
  sky.addColorStop(0, '#050816')
  sky.addColorStop(0.55, COLORS.bg2)
  sky.addColorStop(1, '#4a5fa3')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  for (let k = 0; k < 170; k++) {
    g.globalAlpha = rand(0.3, 1)
    circle(g, rand(0, W), rand(0, GROUND_Y * 0.65), rand(0.6, 1.8), '#fff')
  }
  g.globalAlpha = 1
  g.globalCompositeOperation = 'lighter'
  AURORA.forEach(({ y, amp, th, f, color }) => {
    const grad = g.createLinearGradient(0, y - th - amp, 0, y + th + amp)
    grad.addColorStop(0, rgba(color, 0))
    grad.addColorStop(0.5, rgba(color, 0.3))
    grad.addColorStop(1, rgba(color, 0))
    g.fillStyle = grad
    g.beginPath()
    for (let x = 0; x <= W; x += 20) g.lineTo(x, y - th + Math.sin(x * f) * amp)
    for (let x = W; x >= 0; x -= 20) g.lineTo(x, y + th + Math.sin(x * f + 1) * amp)
    g.fill()
  })
  g.globalCompositeOperation = 'source-over'
  glow(g, 1270, 150, 170, '#cfe3ff', { alpha: 0.45 })
  circle(g, 1270, 150, 52, '#f6f1d5')
  ;[[1252, 138, 9], [1288, 166, 6], [1280, 132, 4]].forEach(([x, y, r]) => circle(g, x, y, r, 'rgba(180,170,130,0.35)'))
  ridge(g, 560, 170, 0.004, 1, '#24346a')
  ridge(g, 650, 110, 0.007, 3, '#18254f')
  // chatka so svietiacim oknom
  const cx = 1240, cy = GROUND_Y - 4
  g.fillStyle = '#3b2418'
  g.fillRect(cx - 60, cy - 70, 120, 70)
  poly(g, [[cx - 78, cy - 66], [cx + 78, cy - 66], [cx, cy - 122]], '#2a1a12')
  poly(g, [[cx - 82, cy - 64], [cx + 82, cy - 64], [cx, cy - 126], [cx, cy - 112]], 'rgba(240,246,255,0.9)')
  glow(g, cx, cy - 36, 70, COLORS.gold, { alpha: 0.6 })
  g.fillStyle = '#ffd98a'
  g.fillRect(cx - 18, cy - 50, 36, 28)
  for (let x = -10; x < W + 20; x += rand(48, 78)) if (Math.abs(x - cx) > 100) fir(g, x, rand(90, 170))
}

let skyCanvas = null
const skyLayer = () => (skyCanvas ||= { img: makeCanvas(W, H, paintSky), w: W, h: H })

// --- zem ---
const groundY0 = GROUND_TOP - HAZE
const glints = Array.from({ length: GLINTS }, () => ({ x: rand(20, W - 20), y: rand(GROUND_Y + 8, H - 10), ph: rand(0, TAU), r: rand(5, 9) }))

function paintGround(g, w, h) {
  const top = HAZE
  const haze = g.createLinearGradient(0, 0, 0, top + 4)
  haze.addColorStop(0, 'rgba(210,225,255,0)')
  haze.addColorStop(1, 'rgba(210,225,255,0.22)')
  g.fillStyle = haze
  g.fillRect(0, 0, w, top + 4)
  const edge = (x) => top + 2 + Math.sin(x * 0.011) * 3 + Math.sin(x * 0.037 + 1) * 2
  const grad = g.createLinearGradient(0, top, 0, h)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.22, '#e6eeff')
  grad.addColorStop(1, '#9fb3e3')
  g.fillStyle = grad
  g.beginPath()
  g.moveTo(0, h)
  for (let x = 0; x <= w; x += 16) g.lineTo(x, edge(x))
  g.lineTo(w, h)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.95)'
  g.lineWidth = 3
  g.beginPath()
  for (let x = 0; x <= w; x += 16) g.lineTo(x, edge(x))
  g.stroke()
  for (let k = 0; k < 70; k++) {
    g.fillStyle = `rgba(150,175,230,${rand(0.12, 0.3)})`
    g.beginPath()
    g.ellipse(rand(0, w), rand(top + 18, h), rand(20, 70), rand(3, 7), 0, 0, TAU)
    g.fill()
  }
  for (let k = 0; k < 90; k++) circle(g, rand(0, w), rand(top + 8, h), rand(0.8, 1.8), 'rgba(255,255,255,0.9)')
}

let groundCanvas = null
const groundLayer = () => (groundCanvas ||= makeCanvas(W + MARGIN * 2, H - groundY0 + MARGIN, (g, c) => paintGround(g, c.width, c.height)))

// Video → obrázok → procedurálne nebo; „cover“ so zoomom, pomalým driftom a parallaxou
export function drawBackground(ctx, t, cam) {
  const layer = bgVideo() || asset('bg') || skyLayer()
  const k = Math.max(W / layer.w, H / layer.h) * BG_ZOOM
  const w = layer.w * k
  const h = layer.h * k
  const dx = Math.sin(t * BG_DRIFT.speed) * BG_DRIFT.x - cam.x * BG_PARALLAX
  const dy = Math.cos(t * BG_DRIFT.speed * 0.7) * BG_DRIFT.y - cam.y * BG_PARALLAX
  ctx.drawImage(layer.img, (W - w) / 2 + dx, (H - h) / 2 + dy, w, h)
}

export function drawGround(ctx, t) {
  ctx.drawImage(groundLayer(), -MARGIN, groundY0)
  ctx.fillStyle = '#fff'
  for (const gl of glints) {
    const a = Math.max(0, Math.sin(t * 2.2 + gl.ph)) ** 8
    if (a < 0.05) continue
    ctx.globalAlpha = a
    starPath(ctx, gl.x, gl.y, gl.r, 4, 0.22, 0)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// --- sneženie: 2 vrstvy (vzadu pomalé a malé, vpredu rýchle a veľké) ---
const SNOW_LAYERS = [
  { n: 90, r: [1, 2.2], vy: [25, 55], drift: 45, sway: 10, alpha: 0.55 },
  { n: 45, r: [2.5, 4.5], vy: [70, 130], drift: 120, sway: 24, alpha: 0.9 },
]
const flake = (L, anyY) => ({ x: rand(-50, W + 50), y: anyY ? rand(-20, H) : rand(-40, -10), r: rand(...L.r), vy: rand(...L.vy), ph: rand(0, TAU) })
const flakes = SNOW_LAYERS.map((L) => Array.from({ length: L.n }, () => flake(L, true)))

export function updateSnow(dt, t, windN) {
  SNOW_LAYERS.forEach((L, li) => {
    for (const f of flakes[li]) {
      f.y += f.vy * dt
      f.x += (windN * L.drift + Math.sin(t * 1.3 + f.ph) * L.sway) * dt
      if (f.y > H + 10) Object.assign(f, flake(L, false))
      if (f.x < -60) f.x += W + 120
      else if (f.x > W + 60) f.x -= W + 120
    }
  })
}

export function drawSnow(ctx, layer) {
  ctx.fillStyle = `rgba(255,255,255,${SNOW_LAYERS[layer].alpha})`
  ctx.beginPath()
  for (const f of flakes[layer]) {
    ctx.moveTo(f.x + f.r, f.y)
    ctx.arc(f.x, f.y, f.r, 0, TAU)
  }
  ctx.fill()
}
