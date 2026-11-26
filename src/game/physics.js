// Deterministická fyzika hodu s pevným krokom (online: obaja klienti počítajú to isté).
import { WORLD, PLAYERS, PLAYER_HITBOX, BALL_R } from '../config.js'

export const DT = 1 / 120
export const STEPS_PER_S = 120
const GRAVITY = 900
const MAX_STEPS = 8 * STEPS_PER_S
const SPEED = [450, 1500]
const HAND = { dx: 40, dy: 120 }
const OUT_MARGIN = 200
const PREVIEW_STEPS = STEPS_PER_S / 2
const PREVIEW_EVERY = 4

// zaokrúhlenie odstráni rozdiely sin/cos medzi JS enginami
const q = (v) => Math.round(v * 1000) / 1000

export const dirOf = (shooter) => (shooter === 0 ? 1 : -1)

function launch(shooter, angle, power) {
  const dir = dirOf(shooter)
  const v = SPEED[0] + (SPEED[1] - SPEED[0]) * power
  return {
    x: PLAYERS[shooter].x + dir * HAND.dx,
    y: WORLD.GROUND_Y - HAND.dy,
    vx: q(Math.cos(angle) * v * dir),
    vy: q(-Math.sin(angle) * v),
  }
}

function step(b, wind) {
  b.vx += wind * DT
  b.vy += GRAVITY * DT
  b.x += b.vx * DT
  b.y += b.vy * DT
}

const touches = (b, cx, cy, r) => (b.x - cx) ** 2 + (b.y - cy) ** 2 <= (r + BALL_R) ** 2

export function simulateThrow({ shooter, angle, power, wind, snowmen, players = PLAYERS }) {
  const b = launch(shooter, angle, power)
  const opp = players[1 - shooter]
  const oppY = WORLD.GROUND_Y - PLAYER_HITBOX.offsetY
  const path = [{ x: b.x, y: b.y }]
  let outcome = 'out'
  for (let i = 0; i < MAX_STEPS; i++) {
    step(b, wind)
    if (b.y >= WORLD.GROUND_Y) b.y = WORLD.GROUND_Y
    path.push({ x: b.x, y: b.y })
    if (touches(b, opp.x, oppY, PLAYER_HITBOX.r)) { outcome = 'hit'; break }
    if (snowmen.some((s) => s.parts.some((p) => touches(b, p.x, p.y, p.r)))) { outcome = 'block'; break }
    if (b.y >= WORLD.GROUND_Y) { outcome = 'splash'; break }
    if (b.x < -OUT_MARGIN || b.x > WORLD.W + OUT_MARGIN) break
  }
  return { path, outcome, at: path[path.length - 1] }
}

// Náhľad mierenia: prvých ~0.5 s bez vetra
export function aimPreview(shooter, angle, power) {
  const b = launch(shooter, angle, power)
  const pts = []
  for (let i = 1; i <= PREVIEW_STEPS && b.y < WORLD.GROUND_Y; i++) {
    step(b, 0)
    if (i % PREVIEW_EVERY === 0) pts.push({ x: b.x, y: b.y })
  }
  return pts
}
