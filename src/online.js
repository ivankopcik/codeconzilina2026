// Live počet ľudí online v celej appke: odznak v hornej časti hernej obrazovky.
// Klient sa každých POLL_MS ohlási na /api/online, server vráti počet aktívnych klientov.
import { WORLD } from './config.js'
import './online.css'

const POLL_MS = 10000
const BADGE_Y = 200 // logické y (1600×900), pod pilulkou „Na ťahu“
const ID_KEY = 'online-id'
const id = sessionStorage.getItem(ID_KEY) || (Math.random().toString(36).slice(2) + '00000000').slice(0, 10)
sessionStorage.setItem(ID_KEY, id)

const screen = document.querySelector('#screen-game')
const canvas = document.querySelector('#game')
const badge = Object.assign(document.createElement('div'), { className: 'online-badge', hidden: true })
badge.innerHTML = '<i class="online-dot"></i><b class="online-n">0</b> online'
screen.append(badge)
const num = badge.querySelector('.online-n')

// rovnaké škálovanie ako hra: canvas sa vmestí do obrazovky so zachovaním pomeru strán
function place() {
  const r = canvas.getBoundingClientRect()
  const scale = Math.min(r.width / WORLD.W, r.height / WORLD.H)
  const oy = (r.height - WORLD.H * scale) / 2
  badge.style.top = `${r.top + oy + BADGE_Y * scale}px`
  badge.style.fontSize = `${Math.max(10, 28 * scale)}px`
}

// krátke poskočenie odznaku pri zmene počtu (reflow reštartuje animáciu)
function bump() {
  badge.classList.remove('is-bump')
  void badge.offsetWidth
  badge.classList.add('is-bump')
}

async function poll() {
  try {
    const res = await fetch(`/api/online?id=${id}`)
    const { n } = res.ok ? await res.json() : {}
    badge.hidden = !Number.isFinite(n)
    if (!badge.hidden) {
      if (num.textContent !== String(n)) bump()
      num.textContent = n
    }
  } catch {
    badge.hidden = true
  }
}

new ResizeObserver(place).observe(canvas)
addEventListener('resize', place)
poll()
setInterval(poll, POLL_MS)
