// Postavy: hráči (AI sprity alebo procedurálna náhrada) a snehuliaci, animácie, menovky, šípka ťahu.
import { WORLD, COLORS, HITS_TO_WIN } from '../config.js'
import { asset } from './assets.js'
import { makeCanvas, circle, rrect, poly, glow, groundShadow, pillLabel, starPath, short, dirOf, TAU } from './util.js'

const { GROUND_Y } = WORLD
export const PLAYER_H = 210
export const HAND = { dx: 40, dy: 120 } // rovnaké ako vo physics.js
const NAME_GAP = 34
const THROW_T = 0.35
const HIT_T = 0.8
const SNOWMAN_HAT = 0.16 // podiel klobúka na výške spritu snehuliaka (trčí nad kolíznymi kruhmi)
const SPRITE_FACING = { p0: 1, p1: -1, cpu: -1 } // kam sa pozerá AI obrázok
const FLASH = ['#ff3b4f', '#ffffff']

// --- procedurálna náhrada postavičky (otočená doprava, nohy dole v strede) ---
const LOOKS = {
  p0: { coat: '#e63946', dark: '#a4161a', trim: '#ffffff', hat: '#e63946', scarf: COLORS.gold, mitten: '#2ec4b6', pants: '#1d3557', boots: '#3b2a20', skin: '#ffd7b5' },
  p1: { coat: '#2ec4b6', dark: '#1a8f84', trim: COLORS.gold, hat: '#2a9d3f', scarf: '#e63946', mitten: '#e63946', pants: '#264653', boots: '#5a3a1e', skin: '#ffd7b5', elf: true },
  cpu: { coat: '#eef3ff', dark: '#b8c4e0', trim: '#ffffff', hat: '#e63946', scarf: '#e63946', mitten: '#9aa7c7', pants: '#9aa7c7', boots: '#5c6b8a', skin: '#eef3ff', robot: true },
}

function paintKid(g, L) {
  rrect(g, 40, 108, 22, 56, 11, L.dark) // zadná ruka
  rrect(g, 58, 166, 18, 50, 8, L.pants)
  rrect(g, 84, 166, 18, 50, 8, L.pants)
  rrect(g, 52, 206, 28, 20, 9, L.boots)
  rrect(g, 82, 206, 32, 20, 9, L.boots)
  rrect(g, 46, 98, 72, 84, 26, L.coat)
  rrect(g, 44, 170, 76, 16, 8, L.trim)
  if (!L.robot) {
    g.fillStyle = '#2b2d42'
    g.fillRect(48, 150, 68, 10)
    g.fillStyle = COLORS.gold
    g.fillRect(74, 147, 16, 16)
  }
  g.save()
  g.translate(104, 112)
  g.rotate(-0.6)
  rrect(g, -10, -2, 20, 52, 10, L.coat)
  circle(g, 0, 52, 11, L.mitten)
  g.restore()
  rrect(g, 50, 90, 66, 16, 8, L.scarf)
  rrect(g, 52, 98, 16, 36, 7, L.scarf)
  if (L.robot) {
    rrect(g, 44, 30, 80, 66, 22, L.coat)
    rrect(g, 64, 46, 56, 30, 14, '#1b2440')
    circle(g, 84, 61, 6, '#5ef2ff')
    circle(g, 106, 61, 6, '#5ef2ff')
  } else {
    if (L.elf) poly(g, [[54, 56], [26, 42], [52, 76]], L.skin)
    circle(g, 84, 62, 34, L.skin)
    circle(g, 95, 58, 4.5, '#1b1b2f')
    circle(g, 111, 58, 4.5, '#1b1b2f')
    circle(g, 96, 56.5, 1.5, '#fff')
    circle(g, 112, 56.5, 1.5, '#fff')
    circle(g, 104, 74, 7, 'rgba(255,110,110,0.45)')
    circle(g, 118, 66, 5, '#ffb08a')
    g.strokeStyle = '#7a2e2e'
    g.lineWidth = 3
    g.beginPath()
    g.arc(103, 74, 8, 0.3, Math.PI - 0.5)
    g.stroke()
  }
  if (L.elf) {
    poly(g, [[48, 40], [124, 40], [22, 6]], L.hat)
    circle(g, 22, 8, 7, COLORS.gold)
  } else {
    poly(g, [[50, 40], [122, 40], [100, 14], [62, 6], [34, 18]], L.hat)
    circle(g, 32, 20, 10, '#ffffff')
  }
  rrect(g, 44, 32, 82, 16, 8, L.trim)
}

const fallbackCache = {}
const fallback = (kind) =>
  (fallbackCache[kind] ||= (() => {
    const img = makeCanvas(170, 232, (g) => paintKid(g, LOOKS[kind]))
    return { img, w: img.width, h: img.height }
  })())

// Prefarbená kópia (záblesk pri zásahu)
const tintCache = new WeakMap()
function tinted(src, color) {
  let m = tintCache.get(src)
  if (!m) tintCache.set(src, (m = {}))
  return (m[color] ||= makeCanvas(src.width, src.height, (g) => {
    g.drawImage(src, 0, 0)
    g.globalCompositeOperation = 'source-atop'
    g.fillStyle = color
    g.fillRect(0, 0, src.width, src.height)
  }))
}

const spriteKind = (s, i) => (i === 0 ? 'p0' : s.mode === 'cpu' ? 'cpu' : 'p1')

function drawDizzy(ctx, x, y, t, k) {
  ctx.globalAlpha = k
  for (let j = 0; j < 3; j++) {
    const a = t * 7 + (j * TAU) / 3
    starPath(ctx, x + Math.cos(a) * 44, y + Math.sin(a) * 12, 11 + 3 * Math.sin(a), 5, 0.45, a)
    ctx.fillStyle = j % 2 ? '#bfe8ff' : COLORS.gold
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(60,30,0,0.6)'
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function turnArrow(ctx, x, y, t) {
  const by = y + Math.sin(t * 6) * 8
  poly(ctx, [[x - 20, by - 24], [x + 20, by - 24], [x, by]], COLORS.gold)
  ctx.lineWidth = 4
  ctx.strokeStyle = '#fff'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

export function drawPlayer(ctx, s, i) {
  const p = s.players[i]
  const kind = spriteKind(s, i)
  const real = asset(kind)
  const spr = real || fallback(kind)
  const facing = dirOf(i)
  const flip = facing * (real ? SPRITE_FACING[kind] : 1)
  const h = PLAYER_H
  const w = (h * spr.w) / spr.h
  const color = COLORS.players[i]
  const active = s.turn === i && s.phase !== 'over'
  const tThrow = s.t - p.lastThrowT
  const tHit = s.t - p.lastHitT

  // dýchanie, hod, zásah, víťazné skákanie
  const breathe = Math.sin(s.t * 2.6 + i * 1.7)
  let sx = 1 - breathe * 0.012
  let sy = 1 + breathe * 0.02
  let rot = 0
  let ox = 0
  let oy = 0
  if (tThrow >= 0 && tThrow < THROW_T) {
    const k = Math.sin((tThrow / THROW_T) * Math.PI)
    rot += facing * 0.2 * k
    sy *= 1 + 0.07 * k
    sx *= 1 - 0.04 * k
    ox += facing * 10 * k
  }
  const hitK = tHit >= 0 && tHit < HIT_T ? 1 - tHit / HIT_T : 0
  if (hitK) {
    rot -= facing * Math.sin(tHit * 28) * 0.22 * hitK
    ox -= facing * 18 * Math.sin((tHit / HIT_T) * Math.PI)
  }
  if (s.phase === 'over' && p.hits >= HITS_TO_WIN) oy = -Math.abs(Math.sin(s.t * 7)) * 34

  const x = p.x + ox
  groundShadow(ctx, x, 70 * (1 + oy / 200))
  if (active) glow(ctx, p.x, GROUND_Y + 2, 120, color, { ry: 28, alpha: 0.45 + 0.25 * Math.sin(s.t * 5) })

  ctx.save()
  ctx.translate(x, GROUND_Y + oy)
  ctx.rotate(rot)
  ctx.scale(flip * sx, sy)
  ctx.drawImage(spr.img, -w / 2, -h, w, h)
  if (hitK) {
    ctx.globalAlpha = hitK * 0.8
    ctx.drawImage(tinted(spr.img, FLASH[Math.floor(tHit * 14) % 2]), -w / 2, -h, w, h)
  }
  ctx.restore()

  const headY = GROUND_Y - h + oy
  if (hitK) drawDizzy(ctx, x, headY - 4, s.t, hitK)
  const tagY = headY - NAME_GAP
  pillLabel(ctx, short(p.name), p.x, tagY, { size: 28, bg: color, border: active ? '#ffffff' : 'rgba(255,255,255,0.35)' })
  if (active) turnArrow(ctx, p.x, tagY - 30, s.t)
}

// --- snehuliaci ---
function paintSnowman(g, sm, cw, ch) {
  const cx = cw / 2
  const P = sm.parts.map((p) => ({ y: ch - (GROUND_Y - p.y), r: p.r }))
  const [b, m, hd] = P
  g.strokeStyle = '#5a3a1e'
  g.lineWidth = 5
  g.lineCap = 'round'
  ;[-1, 1].forEach((d) => {
    g.beginPath()
    g.moveTo(cx + d * m.r * 0.7, m.y)
    g.lineTo(cx + d * (m.r + 34), m.y - 26)
    g.moveTo(cx + d * (m.r + 20), m.y - 16)
    g.lineTo(cx + d * (m.r + 28), m.y - 36)
    g.stroke()
  })
  P.forEach((p) => {
    const gr = g.createRadialGradient(cx - p.r * 0.35, p.y - p.r * 0.4, p.r * 0.1, cx, p.y, p.r)
    gr.addColorStop(0, '#ffffff')
    gr.addColorStop(0.55, '#eef3ff')
    gr.addColorStop(1, '#b4c6ea')
    circle(g, cx, p.y, p.r, gr)
  })
  ;[-0.4, 0, 0.4].forEach((k) => circle(g, cx, m.y + k * m.r, m.r * 0.1, '#22252f'))
  circle(g, cx, b.y - b.r * 0.5, b.r * 0.08, '#22252f')
  rrect(g, cx - hd.r, hd.y + hd.r * 0.62, hd.r * 2, hd.r * 0.38, 6, COLORS.red)
  rrect(g, cx + hd.r * 0.3, hd.y + hd.r * 0.8, hd.r * 0.38, hd.r * 0.95, 5, COLORS.red)
  circle(g, cx - hd.r * 0.32, hd.y - hd.r * 0.15, hd.r * 0.11, '#22252f')
  circle(g, cx + hd.r * 0.32, hd.y - hd.r * 0.15, hd.r * 0.11, '#22252f')
  poly(g, [[cx, hd.y + hd.r * 0.02], [cx + hd.r * 0.8, hd.y + hd.r * 0.14], [cx, hd.y + hd.r * 0.26]], '#ff8c1a')
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * (0.3 + k * 0.1)
    circle(g, cx + Math.cos(a) * hd.r * 0.5, hd.y + hd.r * 0.05 + Math.sin(a) * hd.r * 0.45, hd.r * 0.05, '#22252f')
  }
  rrect(g, cx - hd.r * 1.05, hd.y - hd.r * 0.98, hd.r * 2.1, hd.r * 0.22, 4, '#1d1f2b')
  rrect(g, cx - hd.r * 0.7, hd.y - hd.r * 1.9, hd.r * 1.4, hd.r * 1.0, 4, '#1d1f2b')
  g.fillStyle = COLORS.red
  g.fillRect(cx - hd.r * 0.7, hd.y - hd.r * 1.12, hd.r * 1.4, hd.r * 0.2)
  circle(g, cx + hd.r * 0.45, hd.y - hd.r * 1.1, hd.r * 0.12, '#2a9d3f')
  circle(g, cx + hd.r * 0.3, hd.y - hd.r * 1.05, hd.r * 0.08, COLORS.red)
}

const snowmanCache = new WeakMap()
function snowmanFallback(sm) {
  let c = snowmanCache.get(sm)
  if (!c) {
    const [b, , top] = sm.parts
    const cw = b.r * 2 + 90
    const ch = GROUND_Y - (top.y - top.r) + top.r + 6
    c = makeCanvas(cw, ch, (g) => paintSnowman(g, sm, cw, ch))
    snowmanCache.set(sm, c)
  }
  return c
}

export function drawSnowman(ctx, sm, s) {
  const [b, , top] = sm.parts
  const bodyH = GROUND_Y - (top.y - top.r)
  const hit = s.effects.find((e) => e.type === 'block' && Math.abs(e.x - sm.x) < b.r + 40)
  const rot = hit ? Math.sin(hit.age * 30) * 0.12 * Math.max(0, 1 - hit.age / 0.7) : 0
  groundShadow(ctx, sm.x, b.r * 1.5)
  ctx.save()
  ctx.translate(sm.x, GROUND_Y)
  ctx.rotate(rot)
  const spr = asset('snowman')
  if (spr) {
    const h = bodyH / (1 - SNOWMAN_HAT)
    const w = (h * spr.w) / spr.h
    ctx.drawImage(spr.img, -w / 2, -h, w, h)
  } else {
    const c = snowmanFallback(sm)
    ctx.drawImage(c, -c.width / 2, -c.height)
  }
  ctx.restore()
}
