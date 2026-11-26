// Fujavica: pri silnom vetre počas letu gule prebehne cez scénu nárazový závoj snehu a šľahajú prúdy vetra.
// Len vizuál – dráhu gule počíta physics.js (vietor ju reálne odfukuje), tu sa nič nemení.
import { WORLD, WIND_MAX } from '../config.js'
import { rand, clamp, text, easeOutBack } from './util.js'

const { W, H, GROUND_Y } = WORLD
const STRONG = 0.45 // od akej sily vetra (|wind|/WIND_MAX) príde fujavica
const SWEEP_S = 1.8
const MAX_STREAKS = 160
const BASE_RATE = 45 // prúdy vetra za sekundu pri plnom vetre
const SWEEP_RATE = 280

let streaks = []
let sweepT = -99
let lastPhase = ''

const windOf = (s) => (s.wind || 0) / WIND_MAX
const sweepAge = (s) => (s.t - sweepT) / SWEEP_S
const sweepPower = (s) => {
  const a = sweepAge(s)
  return a >= 0 && a <= 1 ? Math.sin(a * Math.PI) : 0
}

const newStreak = (dir, k) => ({
  x: dir > 0 ? rand(-300, W * 0.35) : rand(W * 0.65, W + 300),
  y: rand(30, GROUND_Y + 30),
  vx: dir * rand(900, 1700) * (0.6 + k),
  vy: rand(-20, 50),
  len: rand(60, 280),
  w: rand(1.5, 4.5),
  life: rand(0.5, 1.1),
  a: rand(0.25, 0.75),
})

export function resetGust() {
  streaks = []
  sweepT = -99
  lastPhase = ''
}

export function updateGust(dt, s) {
  const wn = windOf(s)
  const k = Math.abs(wn)
  const dir = Math.sign(wn) || 1
  if (s.phase === 'flying' && lastPhase !== 'flying' && k > STRONG) sweepT = s.t
  lastPhase = s.phase
  const rate = BASE_RATE * k * k + SWEEP_RATE * sweepPower(s)
  let n = rate * dt
  while (n > 0 && streaks.length < MAX_STREAKS) {
    if (n < 1 && Math.random() > n) break
    n--
    streaks.push(newStreak(dir, k))
  }
  for (const st of streaks) {
    st.x += st.vx * dt
    st.y += st.vy * dt
    st.life -= dt
  }
  streaks = streaks.filter((st) => st.life > 0 && st.x > -500 && st.x < W + 500)
}

export function drawGust(ctx, s) {
  const dir = Math.sign(windOf(s)) || 1
  const sweep = sweepPower(s)
  if (sweep > 0) {
    // snehový závoj, ktorý prebehne cez celú scénu po vetre
    const cx = dir > 0 ? -450 + sweepAge(s) * (W + 900) : W + 450 - sweepAge(s) * (W + 900)
    const g = ctx.createLinearGradient(cx - 480, 0, cx + 480, 0)
    g.addColorStop(0, 'rgba(225,238,255,0)')
    g.addColorStop(0.5, `rgba(225,238,255,${0.42 * sweep})`)
    g.addColorStop(1, 'rgba(225,238,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(-20, -20, W + 40, H + 40)
  }
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#fff'
  for (const st of streaks) {
    ctx.globalAlpha = st.a * Math.min(1, st.life * 2)
    ctx.lineWidth = st.w
    ctx.beginPath()
    ctx.moveTo(st.x, st.y)
    ctx.lineTo(st.x - Math.sign(st.vx) * st.len, st.y - st.vy * 0.08)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  if (sweep <= 0) return
  const pop = easeOutBack(clamp((s.t - sweepT) / 0.3, 0, 1))
  ctx.save()
  ctx.globalAlpha = clamp(sweep * 1.6, 0, 1)
  ctx.translate(W / 2, 230)
  ctx.scale(pop, pop)
  ctx.rotate(dir * -0.05)
  text(ctx, dir > 0 ? 'FÚJAVICA! ➜' : '⬅ FÚJAVICA!', 0, 0, { size: 78, color: '#e6f3ff', stroke: '#1b2a5c', lw: 14 })
  ctx.restore()
}
