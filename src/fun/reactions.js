// Emoji od fanúšikov: DOM vrstva nad hernou obrazovkou + QR pre divákov (?watch=KOD) + pad pre fanúšika.
import QRCode from 'qrcode'
import { COLORS, REACTIONS } from '../config.js'
import { connect } from '../net.js'
import './reactions.css'

const MAX_FLYING = 60
const HYPE_COUNT = 12 // toľko emoji za HYPE_WINDOW_MS = "publikum šalie"
const HYPE_WINDOW_MS = 3000
const HYPE_COOLDOWN_MS = 6000
const HYPE_SHOW_MS = 2200
const QR_SIZE = 120
const rnd = (a, b) => a + Math.random() * (b - a)

export const watchUrl = (room) => `${location.origin}/?watch=${room}`

// Emoji, ktoré vyletí zdola a zmizne (zdieľané pre pódium aj mobil fanúšika)
function flyEmoji(layer, emoji) {
  if (layer.childElementCount > MAX_FLYING) return
  const el = document.createElement('span')
  el.className = 'rx-fly'
  el.textContent = emoji
  el.style.left = `${rnd(4, 92)}%`
  el.style.fontSize = `${rnd(2.2, 4.6)}rem`
  el.style.setProperty('--drift', `${rnd(-12, 12)}vw`)
  el.style.animationDuration = `${rnd(2.2, 3.4)}s`
  el.addEventListener('animationend', () => el.remove())
  layer.append(el)
}

function makeLayer(container) {
  const layer = document.createElement('div')
  layer.className = 'rx-layer'
  container.append(layer)
  return layer
}

// Pódium / hráč: prijíma emoji, ukazuje QR pre fanúšikov a "PUBLIKUM ŠALIE!"
export function attachReactions(container, net) {
  const layer = makeLayer(container)
  const box = document.createElement('div')
  box.className = 'rx-fans'
  box.innerHTML = `<canvas></canvas><b>📣 Fanúšikovia, skenujte!</b><span class="rx-count">0 emoji</span>`
  container.append(box)
  if (net.room) QRCode.toCanvas(box.querySelector('canvas'), watchUrl(net.room), { width: QR_SIZE, margin: 1, color: { dark: COLORS.bg, light: '#ffffff' } })

  const hype = document.createElement('div')
  hype.className = 'rx-hype'
  hype.textContent = '📣 PUBLIKUM ŠALIE! 🔥'
  container.append(hype)

  let total = 0
  let recent = []
  let hypeAt = 0
  let alive = true
  net.onReact((emoji) => {
    if (!alive) return
    flyEmoji(layer, emoji)
    box.querySelector('.rx-count').textContent = `${++total} emoji`
    const now = Date.now()
    recent = recent.filter((t) => now - t < HYPE_WINDOW_MS).concat(now)
    if (recent.length >= HYPE_COUNT && now - hypeAt > HYPE_COOLDOWN_MS) {
      hypeAt = now
      hype.classList.add('on')
      setTimeout(() => hype.classList.remove('on'), HYPE_SHOW_MS)
    }
  })

  return {
    destroy() {
      alive = false
      ;[layer, box, hype].forEach((el) => el.remove())
    },
  }
}

// Mobil fanúšika: veľké emoji tlačidlá, ťuknutie = emoji na plátne
export function showWatch(container, { room }) {
  room = String(room).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) // z URL, nikdy nie surové do HTML
  container.innerHTML = `
    <div class="card rx-watch">
      <h2 class="title">📣 Fanúšik zápasu ${room}</h2>
      <p class="subtitle rx-status">Pripájam sa…</p>
      <div class="rx-pad">${REACTIONS.map((e) => `<button class="rx-btn" type="button" data-emoji="${e}">${e}</button>`).join('')}</div>
      <p class="rx-sent">Ťukaj ako o život, emoji letia na plátno!</p>
      <a class="btn" href="/">← Hrať sám</a>
    </div>`
  const $ = (sel) => container.querySelector(sel)
  const layer = makeLayer(container)
  const status = (text) => ($('.rx-status').textContent = text)
  let sent = 0

  connect()
    .then(async (net) => {
      await net.watch(room)
      status('Si pripojený! 🎉 Povzbudzuj!')
      net.onReact((emoji) => flyEmoji(layer, emoji))
      net.onLeft(() => status('Zápas skončil 🏁'))
      $('.rx-pad').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-emoji]')
        if (!btn) return
        net.sendReact(btn.dataset.emoji)
        navigator.vibrate?.(15)
        btn.classList.remove('pop')
        void btn.offsetWidth
        btn.classList.add('pop')
        $('.rx-sent').textContent = `Poslal si ${++sent} emoji 🚀`
      })
    })
    .catch((err) => status(err.message || 'Zápas sa nenašiel'))
}
