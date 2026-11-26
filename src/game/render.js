// Render scény (kontrakt v CLAUDE.md): video pozadie, sneženie, postavičky, snehuliaci, guľa, efekty, HUD.
// Kreslenie vrstiev je v src/gfx/*, tu je len poradie vrstiev, otras kamery a reset pri novej hre.
import { WORLD, WIND_MAX } from '../config.js'
import { drawBackground, drawGround, updateSnow, drawSnow } from '../gfx/scene.js'
import { drawPlayer, drawSnowman } from '../gfx/actors.js'
import { drawHUD, drawAim, drawOver, drawSlowmo, resetHud } from '../gfx/hud.js'
import { resetFx, updateFx, drawBall, drawFx, drawFlash, drawConfetti } from '../gfx/fx.js'
import { rand, clamp } from '../gfx/util.js'

const SHAKE_PX = 14
let lastState = null
let lastT = 0

export function render(ctx, s) {
  if (s !== lastState) {
    lastState = s
    lastT = s.t
    resetFx()
    resetHud()
  }
  const dt = clamp(s.t - lastT, 0, 0.05)
  lastT = s.t
  updateSnow(dt, s.t, (s.wind || 0) / WIND_MAX)
  updateFx(dt, s)

  const sh = (s.shake || 0) * SHAKE_PX
  const cam = { x: sh ? rand(-sh, sh) : 0, y: sh ? rand(-sh, sh) : 0 }

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, WORLD.W, WORLD.H)
  ctx.clip()
  ctx.translate(cam.x, cam.y)
  drawBackground(ctx, s.t, cam)
  drawSnow(ctx, 0)
  drawGround(ctx, s.t)
  s.snowmen.forEach((sm) => drawSnowman(ctx, sm, s))
  s.players.forEach((_, i) => drawPlayer(ctx, s, i))
  drawAim(ctx, s)
  drawBall(ctx, s)
  drawFx(ctx, s)
  drawSnow(ctx, 1)
  ctx.restore()

  drawFlash(ctx, s)
  drawSlowmo(ctx, s)
  drawHUD(ctx, s)
  drawOver(ctx, s)
  drawConfetti(ctx)
}
