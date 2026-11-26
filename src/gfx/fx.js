// Efekty: snehová guľa so stopou, častice zásahov, komiksové nápisy, rázové vlny, konfety na konci.
import { WORLD, COLORS, BALL_R, HITS_TO_WIN } from '../config.js'
import { TAU, rand, pick, clamp, lerp, easeOutBack, easeOutCubic, circle, glow, groundShadow, snowball, text } from './util.js'

const { W, H, GROUND_Y } = WORLD
const MAX_PARTS = 300
const MAX_CONFETTI = 260
const CONFETTI_RATE = 110 // ks/s
const TEXT_LIFE = 1.1
const SNOW = ['#ffffff', '#e6eeff', '#cfdcf7']
const CONFETTI = [COLORS.red, COLORS.green, COLORS.gold, '#ffffff', '#3a86ff', '#ff7b54']
const UP = [-Math.PI * 0.95, -Math.PI * 0.05]

let parts = []
let confetti = []
let texts = []
let seen = new WeakSet()
let confettiAcc = 0

export function resetFx() {
  parts = []
  confetti = []
  texts = []
  seen = new WeakSet()
  confettiAcc = 0
}

function burst(list, cap, x, y, n, { speed, life, r, colors, arc = [0, TAU], ...rest }) {
  for (let i = 0; i < n && list.length < cap; i++) {
    const a = rand(arc[0], arc[1])
    const v = rand(...speed)
    const L = rand(...life)
    list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rand(...r), life: L, max: L, color: pick(colors), g: 0, drag: 0, grow: 0, rot: rand(0, TAU), vr: 0, alpha: 1, add: false, rect: false, floor: false, ...rest })
  }
}

// Čo sa spustí pri novom efekte: častice + komiksový nápis
const SPAWN = {
  hit: (e) => {
    burst(parts, MAX_PARTS, e.x, e.y, 34, { speed: [220, 720], life: [0.45, 1], r: [3, 6], colors: [COLORS.gold, '#ffffff', '#ffe08a'], g: 500, drag: 2.4, add: true })
    burst(parts, MAX_PARTS, e.x, e.y, 18, { speed: [150, 460], life: [0.8, 1.3], r: [4, 9], colors: SNOW, g: 1200, drag: 0.6, floor: true })
    return ['ZÁSAH!', COLORS.gold, 92]
  },
  block: (e) => {
    burst(parts, MAX_PARTS, e.x, e.y, 26, { speed: [150, 520], life: [0.7, 1.2], r: [4, 11], colors: SNOW, g: 1300, drag: 0.5, arc: UP, floor: true })
    return [pick(['BUM!', 'PUF!', 'BLOK!']), '#bfe8ff', 64]
  },
  splash: (e) => {
    burst(parts, MAX_PARTS, e.x, e.y - 4, 14, { speed: [40, 170], life: [0.6, 1], r: [8, 16], colors: SNOW, g: -30, drag: 2.5, grow: 30, alpha: 0.7, arc: UP })
    burst(parts, MAX_PARTS, e.x, e.y - 4, 10, { speed: [120, 320], life: [0.5, 0.9], r: [2, 5], colors: SNOW, g: 1100, arc: UP, floor: true })
    return [pick(['Vedľa!', 'Tesne!', 'Ups!']), '#dfe9ff', 46]
  },
}

// Rázová vlna z efektu (počíta sa priamo z e.age, bez stavu)
const RING = {
  hit: { t: 0.55, r: [20, 200], w: 16, color: 'rgba(255,209,102,', flat: 1 },
  block: { t: 0.4, r: [10, 110], w: 10, color: 'rgba(255,255,255,', flat: 1 },
  splash: { t: 0.35, r: [8, 80], w: 6, color: 'rgba(255,255,255,', flat: 0.3 },
}

function step(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]
    p.life -= dt
    if (p.life <= 0) {
      list[i] = list[list.length - 1]
      list.pop()
      continue
    }
    const d = Math.max(0, 1 - p.drag * dt)
    p.vx *= d
    p.vy = p.vy * d + p.g * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.r += p.grow * dt
    p.rot += p.vr * dt
    if (p.floor && p.y > GROUND_Y) {
      p.y = GROUND_Y
      p.vy *= -0.3
      p.vx *= 0.6
    }
  }
}

export function updateFx(dt, s) {
  for (const e of s.effects) {
    if (seen.has(e)) continue
    seen.add(e)
    const spawned = SPAWN[e.type]?.(e)
    if (spawned) {
      const [str, color, size] = spawned
      texts.push({ str, color, size, x: clamp(e.x, 220, W - 220), y: Math.min(e.y - 90, GROUND_Y - 120), born: s.t, rot: rand(-0.12, 0.12) })
    }
  }
  const winner = s.phase === 'over' && s.players.some((p) => p.hits >= HITS_TO_WIN)
  if (winner) {
    confettiAcc += dt * CONFETTI_RATE
    for (; confettiAcc >= 1; confettiAcc--) {
      burst(confetti, MAX_CONFETTI, rand(0, W), -20, 1, { speed: [60, 200], life: [3, 4.5], r: [6, 11], colors: CONFETTI, arc: [Math.PI * 0.3, Math.PI * 0.7], g: 140, drag: 0.4, vr: rand(-10, 10), rect: true })
    }
  }
  step(parts, dt)
  step(confetti, dt)
  texts = texts.filter((t) => s.t - t.born < TEXT_LIFE)
}

function drawParticles(ctx, list) {
  for (const p of list) {
    ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.6) * p.alpha
    ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over'
    if (p.rect) {
      const c = Math.abs(Math.cos(p.rot)) // „otáčanie“ konfety bez rotate()
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.r * c, p.y - p.r * 0.6, p.r * 2 * c + 1, p.r * 1.2)
    } else circle(ctx, p.x, p.y, p.r, p.color)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

export function drawBall(ctx, s) {
  const { ball, trail } = s
  if (trail.length) {
    ctx.globalCompositeOperation = 'lighter'
    const n = trail.length
    trail.forEach((p, k) => {
      const f = (k + 1) / n
      circle(ctx, p.x, p.y, BALL_R * (0.25 + 0.65 * f), `rgba(170,210,255,${0.4 * f})`)
    })
    ctx.globalCompositeOperation = 'source-over'
  }
  if (!ball) return
  const sc = clamp(1 - (GROUND_Y - ball.y) / 700, 0.25, 1)
  groundShadow(ctx, ball.x, 26 * sc, 0.5 * sc)
  glow(ctx, ball.x, ball.y, 36, '#bfe0ff', { alpha: 0.55 })
  snowball(ctx, ball.x, ball.y, BALL_R + 2, s.t * 12 * Math.sign(ball.vx || 1))
}

// Rázové vlny, záblesk, častice a nápisy (vo svete, s otrasom kamery)
export function drawFx(ctx, s) {
  for (const e of s.effects) {
    const R = RING[e.type]
    if (!R) continue
    const k = e.age / R.t
    if (k < 1) {
      const r = lerp(R.r[0], R.r[1], easeOutCubic(k))
      ctx.lineWidth = R.w * (1 - k)
      ctx.strokeStyle = `${R.color}${1 - k})`
      ctx.beginPath()
      ctx.ellipse(e.x, e.y, r, r * R.flat, 0, 0, TAU)
      ctx.stroke()
    }
    if (e.type === 'hit' && e.age < 0.3) glow(ctx, e.x, e.y, 220, COLORS.gold, { alpha: 1 - e.age / 0.3 })
  }
  drawParticles(ctx, parts)
  for (const t of texts) {
    const age = s.t - t.born
    const k = easeOutBack(clamp(age / 0.22, 0, 1))
    ctx.save()
    ctx.globalAlpha = 1 - clamp((age - TEXT_LIFE + 0.35) / 0.35, 0, 1)
    ctx.translate(t.x, t.y - age * 50)
    ctx.rotate(t.rot)
    ctx.scale(k, k)
    text(ctx, t.str, 0, 0, { size: t.size, color: t.color, stroke: '#3a0b1a', lw: t.size * 0.2 })
    ctx.restore()
  }
}

// Biely záblesk celej obrazovky pri zásahu (bez otrasu, nad HUD nie)
export function drawFlash(ctx, s) {
  const hit = s.effects.find((e) => e.type === 'hit' && e.age < 0.15)
  if (!hit) return
  ctx.fillStyle = `rgba(255,255,255,${0.28 * (1 - hit.age / 0.15)})`
  ctx.fillRect(0, 0, W, H)
}

export const drawConfetti = (ctx) => drawParticles(ctx, confetti)
