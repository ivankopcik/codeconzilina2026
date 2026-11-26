// HUD (skóre, vietor, správa), mierenie (prak, trajektória, sila) a záverečná obrazovka.
import { WORLD, COLORS, HITS_TO_WIN, WIND_MAX } from '../config.js'
import { HAND } from './actors.js'
import { PANEL_BG, TAU, clamp, lerp, easeOutBack, circle, roundRectPath, text, pillLabel, glow, snowball, powerColor, short, dirOf, rrect } from './util.js'

const { W, H, GROUND_Y } = WORLD
const PANEL = { w: 430, h: 104, y: 18, m: 18, pad: 24, ball: 16, gap: 42 }
const WIND_UI = { y: 18, w: 380, h: 96, len: 130 }
const MSG_Y = 154
const DEG = 180 / Math.PI

let lastMsg = ''
let msgT = 0
let overT = null

function scorePanel(ctx, s, i) {
  const p = s.players[i]
  const right = i === 1
  const x = right ? W - PANEL.w - PANEL.m : PANEL.m
  const col = COLORS.players[i]
  const active = s.turn === i && s.phase !== 'over'
  if (active) glow(ctx, x + PANEL.w / 2, PANEL.y + PANEL.h / 2, PANEL.w * 0.62, col, { ry: PANEL.h, alpha: 0.3 + 0.15 * Math.sin(s.t * 5) })
  roundRectPath(ctx, x, PANEL.y, PANEL.w, PANEL.h, 26)
  ctx.fillStyle = PANEL_BG
  ctx.fill()
  ctx.lineWidth = active ? 5 : 3
  ctx.strokeStyle = active ? col : 'rgba(255,255,255,0.22)'
  ctx.stroke()
  const nx = right ? x + PANEL.w - PANEL.pad : x + PANEL.pad
  const name = short(p.name) + (s.mode === 'vs' && i === s.me ? ' · TY' : '')
  text(ctx, name, nx, PANEL.y + 32, { size: 32, align: right ? 'right' : 'left', color: '#fff', lw: 5 })
  const popT = s.t - s.players[1 - i].lastHitT // čas, keď tento hráč skóroval
  for (let k = 0; k < HITS_TO_WIN; k++) {
    const off = PANEL.ball + k * PANEL.gap
    const bx = right ? x + PANEL.w - PANEL.pad - off : x + PANEL.pad + off
    const by = PANEL.y + 74
    if (k < p.hits) {
      const pop = k === p.hits - 1 && popT >= 0 && popT < 0.5 ? 1 + 0.7 * Math.sin((popT / 0.5) * Math.PI) : 1
      glow(ctx, bx, by, PANEL.ball * 2 * pop, col, { alpha: 0.5 })
      snowball(ctx, bx, by, PANEL.ball * pop)
    } else {
      ctx.setLineDash([5, 5])
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      circle(ctx, bx, by, PANEL.ball - 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
}

function windGauge(ctx, s) {
  const n = clamp(s.wind / WIND_MAX, -1, 1)
  const a = Math.abs(n)
  const dir = n < 0 ? -1 : 1
  const x = W / 2
  const { y, w, h } = WIND_UI
  roundRectPath(ctx, x - w / 2, y, w, h, 28)
  ctx.fillStyle = PANEL_BG
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.stroke()
  const calm = a < 0.03
  const col = a < 0.35 ? '#bfe8ff' : a < 0.7 ? COLORS.gold : '#ff7b54'
  const cy = y + 34
  if (!calm) {
    ctx.lineCap = 'round'
    ctx.lineWidth = 3
    for (let k = 0; k < 6; k++) {
      const ph = (s.t * (0.35 + a * 1.4) + k / 6) % 1
      const sx = x + dir * (ph - 0.5) * (w - 70)
      const sy = cy + ((k % 3) - 1) * 16
      ctx.strokeStyle = `rgba(255,255,255,${0.45 * Math.sin(ph * Math.PI)})`
      ctx.beginPath()
      ctx.moveTo(sx - dir * 22, sy)
      ctx.lineTo(sx, sy)
      ctx.stroke()
    }
    const L = 30 + a * WIND_UI.len
    const x1 = x + (dir * L) / 2
    ctx.strokeStyle = col
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.moveTo(x - (dir * L) / 2, cy)
    ctx.lineTo(x1 - dir * 12, cy)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x1 + dir * 10, cy)
    ctx.lineTo(x1 - dir * 18, cy - 19)
    ctx.lineTo(x1 - dir * 18, cy + 19)
    ctx.closePath()
    ctx.fillStyle = col
    ctx.fill()
  }
  const label = calm ? 'Bezvetrie' : `Vietor ${dir < 0 ? '←' : '→'} ${Math.round(a * 100)} %`
  text(ctx, label, x, y + h - 22, { size: 28, color: calm ? '#fff' : col, lw: 5 })
}

function messageBanner(ctx, s) {
  if (!s.message) return
  if (s.message !== lastMsg) {
    lastMsg = s.message
    msgT = s.t
  }
  const k = easeOutBack(clamp((s.t - msgT) / 0.35, 0, 1))
  ctx.save()
  ctx.translate(W / 2, MSG_Y)
  ctx.scale(k, k)
  pillLabel(ctx, s.message, 0, 0, { size: 34, border: 'rgba(255,255,255,0.25)' })
  ctx.restore()
}

export function drawHUD(ctx, s) {
  s.players.forEach((_, i) => scorePanel(ctx, s, i))
  windGauge(ctx, s)
  if (s.phase !== 'over') messageBanner(ctx, s)
}

// --- mierenie: trajektória, prak, uhlomer, sila ---
export function drawAim(ctx, s) {
  const i = s.turn
  if (s.phase !== 'aim' || i !== s.me) return
  const pl = s.players[i]
  const dir = dirOf(i)
  const hx = pl.x + dir * HAND.dx
  const hy = GROUND_Y - HAND.dy
  const aim = s.aim
  if (!aim) {
    const a = 0.55 + 0.45 * Math.sin(s.t * 4)
    ctx.globalAlpha = a
    text(ctx, 'Potiahni dozadu a pusť!', pl.x + dir * 260, hy - 150, { size: 34, color: COLORS.gold })
    ctx.globalAlpha = 1
    return
  }
  const col = powerColor(aim.power)
  const pts = aim.preview
  pts.forEach((p, k) => {
    const f = k / Math.max(1, pts.length - 1)
    circle(ctx, p.x, p.y, lerp(8, 3, f), `rgba(255,255,255,${lerp(0.95, 0.15, f)})`)
  })
  // uhlomer: výsek od vodorovnej po uhol, veľkosť podľa sily
  const R = 60 + aim.power * 80
  const base = dir > 0 ? 0 : Math.PI
  ctx.beginPath()
  ctx.moveTo(hx, hy)
  ctx.arc(hx, hy, R, base, base - dir * aim.angle, dir > 0)
  ctx.closePath()
  ctx.fillStyle = powerColor(aim.power, 0.25)
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = col
  ctx.stroke()
  // prak: guma od ruky dozadu
  const pull = 30 + aim.power * 90
  const px = hx - Math.cos(aim.angle) * dir * pull
  const py = hy + Math.sin(aim.angle) * pull
  ctx.strokeStyle = '#7a3b12'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(hx, hy - 14)
  ctx.lineTo(px, py)
  ctx.lineTo(hx, hy + 14)
  ctx.stroke()
  snowball(ctx, px, py, 12)
  // stĺpec sily za hráčom
  const bx = pl.x - dir * 100 - 11
  const top = GROUND_Y - 230
  const bh = 190
  rrect(ctx, bx, top, 22, bh, 11, 'rgba(8,12,34,0.7)')
  rrect(ctx, bx, top + bh * (1 - aim.power), 22, bh * aim.power, 11, col)
  roundRectPath(ctx, bx, top, 22, bh, 11)
  ctx.lineWidth = 3
  ctx.strokeStyle = '#fff'
  ctx.stroke()
  text(ctx, `${Math.round(aim.angle * DEG)}°  ${Math.round(aim.power * 100)} %`, hx + dir * 190, hy - 160, { size: 48, color: '#fff', lw: 9 })
}

// --- koniec hry: stmavenie + veľká správa s pop-in ---
export function drawOver(ctx, s) {
  if (s.phase !== 'over') {
    overT = null
    return
  }
  if (overT === null) overT = s.t
  const age = s.t - overT
  ctx.fillStyle = `rgba(5,8,25,${0.45 * clamp(age / 0.5, 0, 1)})`
  ctx.fillRect(0, 0, W, H)
  const k = easeOutBack(clamp(age / 0.5, 0, 1))
  ctx.save()
  ctx.translate(W / 2, H * 0.42)
  ctx.scale(k, k)
  ctx.rotate(Math.sin(s.t * 2) * 0.03)
  glow(ctx, 0, 0, 520, COLORS.gold, { ry: 160, alpha: 0.35 })
  text(ctx, s.message, 0, 0, { size: 96, color: COLORS.gold, stroke: '#7a1020', lw: 18 })
  text(ctx, s.players.map((p) => p.hits).join(' : '), 0, 110, { size: 72, color: '#fff', lw: 12 })
  ctx.restore()
}

// Spomalený finálny zásah: tmavá vineta + „K.O.!“ (state.slowmo 0..1, chýba = 0)
let vignette = null
export function drawSlowmo(ctx, s) {
  const a = s.slowmo || 0
  if (a <= 0.01) return
  vignette ||= (() => {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.62)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,10,0.85)')
    return g
  })()
  ctx.globalAlpha = a
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, W, H)
  const k = easeOutBack(clamp(a * 1.4, 0, 1))
  ctx.save()
  ctx.translate(W / 2, H * 0.36)
  ctx.scale(k * 1.1, k * 1.1)
  ctx.rotate(-0.06)
  glow(ctx, 0, 0, 360, COLORS.red, { ry: 140, alpha: 0.6 })
  text(ctx, 'K.O.!', 0, 0, { size: 150, color: '#ffffff', stroke: COLORS.red, lw: 22 })
  ctx.restore()
  ctx.globalAlpha = 1
}

export const resetHud = () => {
  lastMsg = ''
  overT = null
}
