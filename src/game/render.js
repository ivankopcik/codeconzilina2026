// Render scény (kontrakt v CLAUDE.md): video pozadie, sneženie, postavičky, snehuliaci, guľa, efekty, HUD.
// Kreslenie jednotlivých vrstiev je v src/gfx/*, tu je len poradie vrstiev a efekty zásahov.
import { WORLD, COLORS, WIND_MAX, BALL_R } from '../config.js'
import { drawBackground, drawGround, updateSnow, drawSnow } from '../gfx/scene.js'
import { drawPlayer, drawSnowman } from '../gfx/actors.js'
import { drawHUD, drawAim, drawOver } from '../gfx/hud.js'
import { circle, glow, snowball, text, rand, clamp, easeOutBack, TAU } from '../gfx/util.js'

const { W, H } = WORLD
const SHAKE_PX = 14
const MAX_PARTICLES = 300
const GRAVITY = 900
const FX = {
  hit: { n: 46, speed: [250, 720], r: [3, 8], colors: ['#fff', COLORS.gold, '#ffe9a8'], label: 'ZÁSAH!', labelColor: COLORS.gold },
  block: { n: 26, speed: [180, 480], r: [5, 11], colors: ['#fff', '#dfe9ff', '#bfcff0'], label: 'BUM!', labelColor: '#cfe7ff' },
  splash: { n: 18, speed: [100, 300], r: [3, 7], colors: ['#fff', '#e8f0ff'], label: null },
}

const seen = new WeakSet()
let particles = []
let lastT = 0

function spawn(e) {
  const fx = FX[e.type]
  if (!fx) return
  for (let k = 0; k < fx.n && particles.length < MAX_PARTICLES; k++) {
    const a = e.type === 'splash' ? rand(-Math.PI * 0.95, -Math.PI * 0.05) : rand(0, TAU)
    const v = rand(...fx.speed)
    particles.push({
      x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      r: rand(...fx.r), c: fx.colors[k % fx.colors.length], life: rand(0.5, 1.1), age: 0,
    })
  }
}

function updateParticles(dt) {
  for (const p of particles) {
    p.age += dt
    p.vy += GRAVITY * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.y > WORLD.GROUND_Y) {
      p.y = WORLD.GROUND_Y
      p.vy *= -0.25
      p.vx *= 0.6
    }
  }
  particles = particles.filter((p) => p.age < p.life)
}

function drawParticles(ctx) {
  for (const p of particles) {
    ctx.globalAlpha = 1 - p.age / p.life
    circle(ctx, p.x, p.y, p.r, p.c)
  }
  ctx.globalAlpha = 1
}

function drawEffects(ctx, s) {
  for (const e of s.effects) {
    const fx = FX[e.type]
    if (!fx) continue
    const k = clamp(e.age / 0.5, 0, 1)
    // rázová vlna
    ctx.globalAlpha = 1 - k
    ctx.lineWidth = 8 * (1 - k) + 1
    ctx.strokeStyle = e.type === 'hit' ? COLORS.gold : '#fff'
    ctx.beginPath()
    ctx.arc(e.x, e.y, 20 + k * (e.type === 'hit' ? 140 : 80), 0, TAU)
    ctx.stroke()
    ctx.globalAlpha = 1
    if (e.type === 'hit') glow(ctx, e.x, e.y, 180 * (1 - k * 0.5), COLORS.gold, { alpha: 1 - k })
    if (!fx.label) continue
    const a = clamp(1.4 - e.age, 0, 1)
    if (a <= 0) continue
    const pop = easeOutBack(clamp(e.age / 0.3, 0, 1))
    ctx.save()
    ctx.globalAlpha = a
    ctx.translate(e.x, e.y - 90 - e.age * 60)
    ctx.scale(pop, pop)
    ctx.rotate(-0.08)
    text(ctx, fx.label, 0, 0, { size: e.type === 'hit' ? 84 : 56, color: fx.labelColor, stroke: '#7a1020', lw: 14 })
    ctx.restore()
  }
}

function drawBall(ctx, s) {
  const n = s.trail.length
  s.trail.forEach((pt, k) => {
    const a = (k + 1) / (n + 1)
    circle(ctx, pt.x, pt.y, BALL_R * (0.35 + 0.6 * a), `rgba(220,235,255,${0.5 * a})`)
  })
  if (!s.ball) return
  glow(ctx, s.ball.x, s.ball.y, BALL_R * 4, '#cfe7ff', { alpha: 0.5 })
  snowball(ctx, s.ball.x, s.ball.y, BALL_R * 1.25, s.t * 12)
}

// slow-mo finálneho zásahu (state.slowmo od fun-factor): vineta + K.O.!
function drawSlowmo(ctx, s) {
  const m = s.slowmo || 0
  if (m <= 0.01) return
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${0.75 * m})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.globalAlpha = m
  ctx.translate(W / 2, H * 0.4)
  const k = 1 + (1 - m) * 0.4
  ctx.scale(k, k)
  text(ctx, 'K.O.!', 0, 0, { size: 180, color: COLORS.red, stroke: '#fff', lw: 16 })
  ctx.restore()
}

export function render(ctx, s) {
  const dt = clamp(s.t - lastT, 0, 0.05)
  lastT = s.t
  s.effects.forEach((e) => {
    if (seen.has(e)) return
    seen.add(e)
    spawn(e)
  })
  updateParticles(dt)
  updateSnow(dt, s.t, (s.wind || 0) / WIND_MAX)

  const sh = (s.shake || 0) * SHAKE_PX
  const cam = { x: sh ? rand(-sh, sh) : 0, y: sh ? rand(-sh, sh) : 0 }

  ctx.save()
  ctx.translate(cam.x, cam.y)
  drawBackground(ctx, s.t, cam)
  drawSnow(ctx, 0)
  drawGround(ctx, s.t)
  s.snowmen.forEach((sm) => drawSnowman(ctx, sm, s))
  s.players.forEach((_, i) => drawPlayer(ctx, s, i))
  drawAim(ctx, s)
  drawBall(ctx, s)
  drawEffects(ctx, s)
  drawParticles(ctx)
  drawSnow(ctx, 1)
  ctx.restore()

  drawHUD(ctx, s)
  drawSlowmo(ctx, s)
  drawOver(ctx, s)
}
