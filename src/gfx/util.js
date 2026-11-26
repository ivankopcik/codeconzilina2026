// Spoločné matematické a kresliace helpery grafiky (DRY). Všetko v logických súradniciach 1600×900.
import { WORLD } from '../config.js'

export const TAU = Math.PI * 2
export const FONT_FAMILY = "Nunito, system-ui, -apple-system, 'Segoe UI', sans-serif"
export const PANEL_BG = 'rgba(8,12,34,0.62)'
export const TEXT_STROKE = 'rgba(8,12,32,0.85)'
const SHADOW_COLOR = '#0a1230'

export const font = (size, weight = 900) => `${weight} ${size}px ${FONT_FAMILY}`
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const lerp = (a, b, k) => a + (b - a) * k
export const rand = (a, b) => a + Math.random() * (b - a)
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
export const easeOutCubic = (k) => 1 - (1 - k) ** 3
export const easeOutBack = (k) => {
  const c = 1.70158
  const x = k - 1
  return 1 + (c + 1) * x * x * x + c * x * x
}
export const short = (s, max = 14) => (s && s.length > max ? `${s.slice(0, max - 1)}…` : s || '')
export const dirOf = (i) => (i === 0 ? 1 : -1) // hráč 0 sa pozerá doprava, hráč 1 doľava

// hex → rgba s alfou
export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}
// farba podľa sily: zelená → žltá → červená
export const powerColor = (p, a = 1) => `hsla(${Math.round(120 - 120 * p)},90%,55%,${a})`

export function makeCanvas(w, h, paint) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  if (paint) paint(c.getContext('2d'), c)
  return c
}

export function circle(ctx, x, y, r, fill) {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0, r), 0, TAU)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
}

export function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function rrect(ctx, x, y, w, h, r, fill) {
  roundRectPath(ctx, x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

export function poly(ctx, pts, fill) {
  ctx.beginPath()
  pts.forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

export function starPath(ctx, x, y, r, n = 5, inner = 0.45, rot = -Math.PI / 2) {
  ctx.beginPath()
  for (let k = 0; k < n * 2; k++) {
    const a = rot + (k * Math.PI) / n
    const rr = k % 2 ? r * inner : r
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
}

// Text s obrysom (čitateľný na pódiu aj na mobile)
export function text(ctx, str, x, y, { size = 32, weight = 900, color = '#fff', stroke = TEXT_STROKE, lw = size * 0.18, align = 'center', baseline = 'middle' } = {}) {
  ctx.font = font(size, weight)
  ctx.textAlign = align
  ctx.textBaseline = baseline
  if (stroke) {
    ctx.lineJoin = 'round'
    ctx.lineWidth = lw
    ctx.strokeStyle = stroke
    ctx.strokeText(str, x, y)
  }
  ctx.fillStyle = color
  ctx.fillText(str, x, y)
}

// Zaoblená „pilulka“ s textom (menovky, banner)
export function pillLabel(ctx, str, x, y, { size = 28, bg = PANEL_BG, color = '#fff', border = null, h = size * 1.75 } = {}) {
  ctx.font = font(size)
  const w = ctx.measureText(str).width + size * 1.4
  roundRectPath(ctx, x - w / 2, y - h / 2, w, h, h / 2)
  ctx.fillStyle = bg
  ctx.fill()
  if (border) {
    ctx.lineWidth = 4
    ctx.strokeStyle = border
    ctx.stroke()
  }
  text(ctx, str, x, y + size * 0.05, { size, color, stroke: null })
  return w
}

// Predpočítaná mäkká žiara (namiesto drahého shadowBlur)
const glowCache = new Map()
function glowSprite(color) {
  let c = glowCache.get(color)
  if (!c) {
    c = makeCanvas(128, 128, (g) => {
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
      grad.addColorStop(0, rgba(color, 1))
      grad.addColorStop(0.3, rgba(color, 0.55))
      grad.addColorStop(1, rgba(color, 0))
      g.fillStyle = grad
      g.fillRect(0, 0, 128, 128)
    })
    glowCache.set(color, c)
  }
  return c
}

export function glow(ctx, x, y, rx, color, { alpha = 1, ry = rx, add = true } = {}) {
  if (alpha <= 0 || rx <= 0) return
  const prevA = ctx.globalAlpha
  const prevC = ctx.globalCompositeOperation
  ctx.globalAlpha = prevA * Math.min(1, alpha)
  if (add) ctx.globalCompositeOperation = 'lighter'
  ctx.drawImage(glowSprite(color), x - rx, y - ry, rx * 2, ry * 2)
  ctx.globalAlpha = prevA
  ctx.globalCompositeOperation = prevC
}

// Mäkký tieň na zemi
export const groundShadow = (ctx, x, rx, alpha = 0.45) =>
  glow(ctx, x, WORLD.GROUND_Y + 4, rx, SHADOW_COLOR, { ry: rx * 0.2, alpha, add: false })

// Snehová guľa: tieňovanie je pevné (svetlo zhora-zľava), zrnká sa točia
let ballShade = null
let ballGrain = null
export function snowball(ctx, x, y, r, rot = 0) {
  ballShade ||= makeCanvas(64, 64, (g) => {
    const grad = g.createRadialGradient(24, 22, 3, 32, 32, 31)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.55, '#e9f1ff')
    grad.addColorStop(1, '#9db2dc')
    circle(g, 32, 32, 30, grad)
    g.lineWidth = 2
    g.strokeStyle = 'rgba(80,110,170,0.55)'
    g.stroke()
  })
  ballGrain ||= makeCanvas(64, 64, (g) => {
    ;[[40, 38, 4], [22, 40, 3], [38, 20, 2.5], [46, 28, 2], [28, 48, 2.5], [20, 26, 2]].forEach(([a, b, c]) =>
      circle(g, a, b, c, 'rgba(140,165,215,0.6)'),
    )
  })
  ctx.drawImage(ballShade, x - r, y - r, r * 2, r * 2)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.drawImage(ballGrain, -r, -r, r * 2, r * 2)
  ctx.restore()
}
