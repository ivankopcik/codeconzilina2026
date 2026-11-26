// Herná slučka: ťahy, vstup (prak + klávesnica), CPU, online synchronizácia, škálovanie canvasu.
import { WORLD, PLAYERS, HITS_TO_WIN, COLORS, DEFAULT_AVATARS } from '../config.js'
import { render } from './render.js'
import { simulateThrow, aimPreview, dirOf, STEPS_PER_S } from './physics.js'
import { chooseThrow } from './ai.js'
import { makeSnowmen, windForTurn } from './rng.js'
import { sfx } from '../sfx.js'
import { createCommentator } from '../fun/commentator.js'

const DEG = Math.PI / 180
const MAX_ANGLE = 85 * DEG
const DRAG_FULL = 300
const MIN_POWER = 0.08
const KEY_ANGLE = 2 * DEG
const KEY_POWER = 0.03
const NEXT_TURN_MS = 800
const CPU_DELAY_MS = 900
const END_DELAY_MS = 2200
const LEFT_DELAY_MS = 2000
const EFFECT_LIFE = 1.5
const SHAKE_DECAY = 2.5
const BLOCK_SHAKE = 0.35
const TRAIL_LEN = 36
const TRAIL_EVERY = 3
const LONG_AGO = -100
const COMBO_MIN = 2 // kombo = toľko zásahov za sebou (Mortal Kombat štýl)
const SFX_AS_HIT = ['matchpoint', 'combo', 'brutality', 'breaker']
const KO_SPEED = 0.25 // K.O. slow-mo: rýchlosť animácie pri poslednom zásahu (fyzika sa nemení)
const KO_STEPS = 72 // koľko krokov dráhy pred dopadom ide spomalene (~0.6 s)
const SLOWMO_DECAY = 0.8

const MSG = {
  turn: (name) => `Na ťahu: ${name}`,
  waitVs: 'Čakám na súpera…',
  waitCpu: 'Počítač mieri…',
  won: (name) => `Vyhral ${name}! 🎉`,
  left: 'Súper odišiel',
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export function startGame({ canvas, mode, seed, me, names, avatars, net, onEnd }) {
  const ctx = canvas.getContext('2d')
  const startedAt = performance.now()
  const timers = new Set()
  const remoteQueue = []
  let alive = true
  let ended = false
  let raf = 0
  let last = performance.now()
  let view = { scale: 1, ox: 0, oy: 0, dpr: 1 }
  let turnNo = 0
  let turnReady = false // ťah začal a ešte sa nehodilo
  let flight = null // { res, shooter, clock, ko }
  let drag = null // { x, y, id }
  let usingKeys = false
  let keyAim = { angle: 45 * DEG, power: 0.6 }
  let myThrows = 0
  const streak = [0, 0] // zásahy za sebou pre každého hráča

  const state = {
    t: 0,
    mode,
    me,
    turn: 0,
    phase: 'wait',
    message: '',
    players: PLAYERS.map((p, i) => ({ x: p.x, name: names[i], avatar: avatars?.[i] || DEFAULT_AVATARS[i], hits: 0, lastThrowT: LONG_AGO, lastHitT: LONG_AGO })),
    snowmen: makeSnowmen(seed),
    ball: null,
    trail: [],
    aim: null,
    wind: 0,
    effects: [],
    shake: 0,
    slowmo: 0, // 0..1, K.O. spomalenie pri poslednom zásahu
  }

  // Herné udalosti: zvuk (GRAFIKA) + komentátor Mrázik. Typy: start|throw|hit|block|splash|out|matchpoint|win|lose
  const commentator = createCommentator(canvas.parentElement, { names, me, mode })
  function emit(type, data = {}) {
    sfx(SFX_AS_HIT.includes(type) ? 'hit' : type)
    commentator.say(type === 'lose' ? 'win' : type, data)
  }

  const later = (ms, fn) => {
    const id = setTimeout(() => {
      timers.delete(id)
      if (alive) fn()
    }, ms)
    timers.add(id)
  }
  const canAim = () => alive && turnReady && state.phase === 'aim' && state.turn === me
  const isCpuTurn = () => mode === 'cpu' && state.turn !== me

  function setAim({ angle, power }) {
    keyAim = { angle, power }
    state.aim = { angle, power, preview: aimPreview(me, angle, power) }
  }

  // --- ťahy ---
  function beginTurn() {
    state.turn = turnNo % 2
    state.wind = windForTurn(seed, turnNo)
    turnReady = true
    if (state.turn === me) {
      state.phase = 'aim'
      state.message = MSG.turn(names[me])
      if (usingKeys) setAim(keyAim)
      return
    }
    state.phase = 'wait'
    state.message = mode === 'cpu' ? MSG.waitCpu : MSG.waitVs
    if (isCpuTurn()) {
      later(CPU_DELAY_MS, () => {
        if (!turnReady) return
        throwBall(chooseThrow({ shooter: state.turn, wind: state.wind, snowmen: state.snowmen, players: state.players }))
      })
    } else playRemote()
  }

  function throwBall({ angle, power }) {
    const shooter = state.turn
    turnReady = false
    const res = simulateThrow({ shooter, angle, power, wind: state.wind, snowmen: state.snowmen, players: state.players })
    const ko = res.outcome === 'hit' && state.players[shooter].hits + 1 >= HITS_TO_WIN
    flight = { res, shooter, clock: 0, ko }
    state.phase = 'flying'
    state.aim = null
    state.players[shooter].lastThrowT = state.t
    emit('throw', { shooter })
    if (shooter === me) myThrows++
  }

  function myThrow(aim) {
    if (!canAim()) return
    const shot = { angle: aim.angle, power: aim.power }
    if (mode === 'vs') net?.sendThrow(shot)
    throwBall(shot)
  }

  function playRemote() {
    if (turnReady && mode === 'vs' && state.turn !== me && remoteQueue.length) throwBall(remoteQueue.shift())
  }

  function land() {
    const { res, shooter } = flight
    flight = null
    state.ball = null
    state.trail = []
    if (res.outcome !== 'out') state.effects.push({ type: res.outcome, x: res.at.x, y: res.at.y, age: 0 })
    if (res.outcome === 'block') state.shake = Math.max(state.shake, BLOCK_SHAKE)
    // Kombo: zásahy toho istého hráča za sebou; zásah súpera s rozbehnutým kombom = COMBO BREAKER
    const hit = res.outcome === 'hit'
    const breaker = hit && streak[1 - shooter] >= COMBO_MIN
    if (hit) streak[1 - shooter] = 0
    streak[shooter] = hit ? streak[shooter] + 1 : 0
    const info = { shooter, combo: streak[shooter] >= COMBO_MIN ? streak[shooter] : 0, breaker }
    if (hit) {
      state.players[shooter].hits++
      state.players[1 - shooter].lastHitT = state.t // čas, kedy bol hráč zasiahnutý
      state.shake = 1
      if (state.players[shooter].hits >= HITS_TO_WIN) {
        state.phase = 'over'
        state.message = MSG.won(names[shooter])
        sfx('hit')
        emit(shooter === me ? 'win' : 'lose', info)
        later(END_DELAY_MS, () => finish(shooter === me))
        return
      }
    }
    const hits = state.players[shooter].hits
    const type = !hit ? res.outcome
      : hits === HITS_TO_WIN - 1 ? 'matchpoint'
      : breaker ? 'breaker'
      : info.combo > COMBO_MIN ? 'brutality'
      : info.combo ? 'combo'
      : 'hit'
    emit(type, info)
    state.phase = 'wait'
    later(NEXT_TURN_MS, () => {
      turnNo++
      beginTurn()
    })
  }

  function finish(won) {
    if (ended) return
    ended = true
    const score = state.players.map((p) => p.hits)
    const hits = score[me]
    const result = {
      mode,
      won,
      names,
      me,
      score,
      throws: myThrows,
      hits,
      accuracy: myThrows ? hits / myThrows : 0,
      durationSec: Math.round((performance.now() - startedAt) / 1000),
    }
    destroy()
    onEnd?.(result)
  }

  // --- animácia letu po predpočítaných bodoch ---
  const timeScale = () => 1 - (1 - KO_SPEED) * state.slowmo

  function updateFlight(dt) {
    const { path } = flight.res
    if (flight.ko && path.length - 1 - flight.clock * STEPS_PER_S < KO_STEPS) state.slowmo = 1
    flight.clock += dt * timeScale()
    const i = Math.min(path.length - 1, Math.floor(flight.clock * STEPS_PER_S))
    const p = path[i]
    const prev = path[Math.max(0, i - 1)]
    state.ball = { x: p.x, y: p.y, vx: (p.x - prev.x) * STEPS_PER_S, vy: (p.y - prev.y) * STEPS_PER_S }
    state.trail = path.slice(Math.max(0, i - TRAIL_LEN), i + 1).filter((_, k) => k % TRAIL_EVERY === 0)
    if (i === path.length - 1) land()
  }

  function frame(now) {
    if (!alive) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    state.t += dt
    if (flight) updateFlight(dt)
    else state.slowmo = Math.max(0, state.slowmo - dt * SLOWMO_DECAY)
    state.effects.forEach((e) => (e.age += dt * timeScale()))
    state.effects = state.effects.filter((e) => e.age < EFFECT_LIFE)
    state.shake = Math.max(0, state.shake - dt * SHAKE_DECAY)

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const k = view.dpr * view.scale
    ctx.setTransform(k, 0, 0, k, view.dpr * view.ox, view.dpr * view.oy)
    render(ctx, state)
    raf = requestAnimationFrame(frame)
  }

  // --- canvas: celá obrazovka, DPR, letterbox 1600×900 ---
  function resize() {
    const dpr = window.devicePixelRatio || 1
    const cw = canvas.clientWidth || window.innerWidth
    const ch = canvas.clientHeight || window.innerHeight
    canvas.width = Math.round(cw * dpr)
    canvas.height = Math.round(ch * dpr)
    const scale = Math.min(cw / WORLD.W, ch / WORLD.H)
    view = { scale, ox: (cw - WORLD.W * scale) / 2, oy: (ch - WORLD.H * scale) / 2, dpr }
  }

  function toLogical(e) {
    const r = canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left - view.ox) / view.scale, y: (e.clientY - r.top - view.oy) / view.scale }
  }

  // --- vstup: prak ---
  function onDown(e) {
    if (!canAim()) return
    e.preventDefault()
    const p = toLogical(e)
    drag = { x: p.x, y: p.y, id: e.pointerId }
    usingKeys = false
    state.aim = null
    canvas.setPointerCapture?.(e.pointerId)
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.id || !canAim()) return
    const p = toLogical(e)
    const dx = (drag.x - p.x) * dirOf(me)
    const dy = p.y - drag.y // ťahanie nadol = hod nahor
    const angle = clamp(Math.atan2(dy, dx), 0, MAX_ANGLE)
    const power = clamp(Math.hypot(dx, dy) / DRAG_FULL, 0, 1)
    setAim({ angle, power })
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return
    drag = null
    const aim = state.aim
    if (aim && aim.power > MIN_POWER) myThrow(aim)
    else state.aim = null
  }

  // --- vstup: klávesnica (pódium) ---
  const KEYS = {
    ArrowLeft: () => ({ angle: keyAim.angle + KEY_ANGLE * dirOf(me), power: keyAim.power }),
    ArrowRight: () => ({ angle: keyAim.angle - KEY_ANGLE * dirOf(me), power: keyAim.power }),
    ArrowUp: () => ({ angle: keyAim.angle, power: keyAim.power + KEY_POWER }),
    ArrowDown: () => ({ angle: keyAim.angle, power: keyAim.power - KEY_POWER }),
  }

  function onKey(e) {
    if (!canAim()) return
    if (e.code === 'Space') {
      e.preventDefault()
      myThrow(keyAim)
      return
    }
    const next = KEYS[e.key]
    if (!next) return
    e.preventDefault()
    usingKeys = true
    const { angle, power } = next()
    setAim({ angle: clamp(angle, 0, MAX_ANGLE), power: clamp(power, 0, 1) })
  }

  // --- online ---
  if (mode === 'vs' && net) {
    net.onThrow((shot) => {
      if (!alive) return
      remoteQueue.push({ angle: +shot.angle, power: +shot.power })
      playRemote()
    })
    net.onLeft(() => {
      if (!alive || state.phase === 'over') return
      turnReady = false
      flight = null
      state.ball = null
      state.aim = null
      state.phase = 'over'
      state.message = MSG.left
      later(LEFT_DELAY_MS, () => finish(state.players[me].hits >= state.players[1 - me].hits))
    })
  }

  const listeners = [
    [canvas, 'pointerdown', onDown],
    [canvas, 'pointermove', onMove],
    [canvas, 'pointerup', onUp],
    [canvas, 'pointercancel', onUp],
    [window, 'keydown', onKey],
    [window, 'resize', resize],
  ]
  listeners.forEach(([el, type, fn]) => el.addEventListener(type, fn))

  function destroy() {
    if (!alive) return
    alive = false
    cancelAnimationFrame(raf)
    timers.forEach(clearTimeout)
    timers.clear()
    listeners.forEach(([el, type, fn]) => el.removeEventListener(type, fn))
    commentator.destroy()
  }

  resize()
  beginTurn()
  emit('start')
  raf = requestAnimationFrame(frame)
  return { destroy }
}
