// PLACEHOLDER – tento súbor vlastní session GRAFIKA a celý ho nahradí.
// Kontrakt: render(ctx, state) podľa CLAUDE.md, ctx je v logických súradniciach 1600×900.
import { WORLD, COLORS, PLAYER_HITBOX, BALL_R, WIND_MAX, HITS_TO_WIN } from '../config.js'

const circle = (ctx, x, y, r, color) => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

export function render(ctx, s) {
  const { W, H, GROUND_Y } = WORLD
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = COLORS.snow
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y)

  s.snowmen.forEach((sm) => sm.parts.forEach((p) => circle(ctx, p.x, p.y, p.r, COLORS.snow)))
  s.players.forEach((p, i) => circle(ctx, p.x, GROUND_Y - PLAYER_HITBOX.offsetY, PLAYER_HITBOX.r, COLORS.players[i]))
  s.aim?.preview?.forEach((pt) => circle(ctx, pt.x, pt.y, 4, COLORS.gold))
  s.trail.forEach((pt) => circle(ctx, pt.x, pt.y, 3, 'rgba(255,255,255,0.4)'))
  if (s.ball) circle(ctx, s.ball.x, s.ball.y, BALL_R, '#fff')
  s.effects.forEach((e) => circle(ctx, e.x, e.y, 20 + e.age * 60, `rgba(255,209,102,${Math.max(0, 1 - e.age)})`))

  ctx.fillStyle = COLORS.text
  ctx.textAlign = 'center'
  ctx.font = 'bold 44px system-ui'
  ctx.fillText(`${s.players[0].name} ${s.players[0].hits} : ${s.players[1].hits} ${s.players[1].name}  (do ${HITS_TO_WIN})`, W / 2, 64)
  ctx.font = 'bold 32px system-ui'
  const w = Math.round((s.wind / WIND_MAX) * 100)
  ctx.fillText(`Vietor ${w < 0 ? '←' : '→'} ${Math.abs(w)} %`, W / 2, 112)
  ctx.fillText(s.message || '', W / 2, 160)
}
