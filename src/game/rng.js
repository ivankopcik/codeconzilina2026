// Deterministický svet zo spoločného seedu (rovnaký u oboch klientov).
import { WORLD, WIND_MAX } from '../config.js'

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Vietor ťahu t v px/s² (záporný = doľava)
export const windForTurn = (seed, t) => (mulberry32(seed + t * 9973)() * 2 - 1) * WIND_MAX

const SNOWMAN_X = [520, 1080]
const SNOWMAN_RADII = [46, 34, 24] // zdola nahor
const STACK_OVERLAP = 0.8

// 1–3 snehuliaci rozostúpení v strede, každý 3 kruhy na sebe od zeme
export function makeSnowmen(seed) {
  const rand = mulberry32(seed)
  const count = 1 + Math.floor(rand() * 3)
  const slot = (SNOWMAN_X[1] - SNOWMAN_X[0]) / count
  return Array.from({ length: count }, (_, i) => {
    const x = SNOWMAN_X[0] + slot * (i + 0.5) + (rand() - 0.5) * slot * 0.4
    const scale = 0.85 + rand() * 0.3
    let y = WORLD.GROUND_Y
    let prevR = 0
    const parts = SNOWMAN_RADII.map((base, k) => {
      const r = base * scale
      y = k === 0 ? WORLD.GROUND_Y - r : y - (prevR + r) * STACK_OVERLAP
      prevR = r
      return { x, y, r }
    })
    return { x, parts }
  })
}
