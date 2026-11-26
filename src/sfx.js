// Zvuky z ElevenLabs (public/assets/sfx). Web Audio: nízka latencia, prekrývanie, plynulá slučka hudby.
const SOUNDS = {
  throw: 0.7,
  hit: 1,
  splash: 0.6,
  block: 0.9,
  win: 0.9,
  lose: 0.9,
  click: 0.5,
  music: 0.32,
}
const KEY = 'muted'

let ctx = null
let master = null
let musicSrc = null
let wantMusic = false
let muted = localStorage.getItem(KEY) === '1'
const buffers = {}

function init() {
  if (ctx) return
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : 1
  master.connect(ctx.destination)
  Object.keys(SOUNDS).forEach((name) =>
    fetch(`/assets/sfx/${name}.mp3`)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => {
        buffers[name] = buf
        if (name === 'music' && wantMusic) startMusic()
      })
      .catch(() => {}),
  )
}

function play(name, loop = false) {
  const buf = buffers[name]
  if (!ctx || !buf) return null
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  src.buffer = buf
  src.loop = loop
  gain.gain.value = SOUNDS[name]
  src.connect(gain).connect(master)
  src.start()
  return src
}

function startMusic() {
  if (!musicSrc) musicSrc = play('music', true)
}

// Prehliadače povolia zvuk až po geste používateľa
function unlock() {
  init()
  ctx?.resume()
}
;['pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, unlock, { passive: true }))

export const sfx = (name) => play(name)

export function music(on = true) {
  wantMusic = on
  init()
  if (on) startMusic()
  else {
    musicSrc?.stop()
    musicSrc = null
  }
}

export const isMuted = () => muted

export function toggleMute() {
  muted = !muted
  localStorage.setItem(KEY, muted ? '1' : '0')
  if (master) master.gain.value = muted ? 0 : 1
  return muted
}
