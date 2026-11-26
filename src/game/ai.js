// CPU súper: prehľadá mriežku uhlov a síl, vyberie najlepší hod a pridá ľudskú nepresnosť.
import { WORLD, PLAYER_HITBOX } from '../config.js'
import { simulateThrow } from './physics.js'

const DEG = Math.PI / 180
const ANGLES = [15, 75, 2.5]
const POWERS = [0.2, 1, 0.025]
const NOISE_DEG = 7
const NOISE_POWER = 0.1
const HIT_BONUS = 1e4

const range = ([from, to, stepBy]) =>
  Array.from({ length: Math.round((to - from) / stepBy) + 1 }, (_, i) => from + i * stepBy)
const jitter = (rand) => rand() * 2 - 1
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export function chooseThrow({ shooter, wind, snowmen, players, rand = Math.random }) {
  const target = { x: players[1 - shooter].x, y: WORLD.GROUND_Y - PLAYER_HITBOX.offsetY }
  let best = null
  for (const deg of range(ANGLES)) {
    for (const power of range(POWERS)) {
      const { outcome, at } = simulateThrow({ shooter, angle: deg * DEG, power, wind, snowmen, players })
      const score = Math.hypot(at.x - target.x, at.y - target.y) - (outcome === 'hit' ? HIT_BONUS : 0)
      if (!best || score < best.score) best = { score, deg, power }
    }
  }
  return {
    angle: clamp(best.deg + jitter(rand) * NOISE_DEG, 5, 85) * DEG,
    power: clamp(best.power * (1 + jitter(rand) * NOISE_POWER), 0.1, 1),
  }
}
