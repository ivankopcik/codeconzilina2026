import './style.css'
import { TEXTS } from './config.js'
import { startGame } from './game/game.js'
import { showLobby } from './lobby.js'
import { showResults } from './results.js'
import { sfx, music, toggleMute, isMuted } from './sfx.js'
import { attachReactions, showWatch } from './fun/reactions.js'

const $ = (sel) => document.querySelector(sel)
const nameInput = $('#name')
const roomInput = $('#room')
const menu = $('#screen-menu')

// AI video pozadie (Higgsfield): na výšku menu.mp4, na šírku bg.mp4; počas hry pauza (canvas má vlastné)
const bgVideo = $('#bg-video')
const bgName = matchMedia('(max-aspect-ratio: 1/1)').matches ? 'menu' : 'bg'
bgVideo.poster = `/assets/${bgName}.webp`
bgVideo.src = `/assets/${bgName}.mp4`

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id))
  if (id === 'screen-game') bgVideo.pause()
  else bgVideo.play().catch(() => {})
}

// Zvuk: klik na tlačidlá + hudba po prvom geste, prepínač 🔊/🔇
const muteBtn = $('#mute')
const muteIcon = () => (muteBtn.textContent = isMuted() ? '🔇' : '🔊')
muteIcon()
muteBtn.addEventListener('click', () => {
  toggleMute()
  muteIcon()
})
document.addEventListener('click', (e) => {
  if (!e.target.closest('.btn')) return
  sfx('click')
  music()
})

nameInput.value = localStorage.getItem('name') || ''
function playerName() {
  const name = nameInput.value.trim() || TEXTS.defaultName
  localStorage.setItem('name', name)
  return name
}

let game = null
let net = null
let fans = null // emoji od fanúšikov (len VS)
function play(opts) {
  game?.destroy()
  fans?.destroy()
  fans = opts.net ? attachReactions($('#screen-game'), opts.net) : null
  showScreen('screen-game')
  game = startGame({
    canvas: $('#game'),
    ...opts,
    onEnd(result) {
      showScreen('screen-results')
      showResults($('#screen-results'), result, { onRestart: toMenu })
    },
  })
}

function toMenu() {
  game?.destroy()
  fans?.destroy()
  fans = null
  net?.close?.()
  game = net = null
  history.replaceState(null, '', location.pathname)
  menu.querySelector('.menu').classList.remove('joining')
  showScreen('screen-menu')
}

function lobby(room) {
  showScreen('screen-lobby')
  showLobby($('#screen-lobby'), {
    name: playerName(),
    room,
    onStart: (session) => {
      net = session.net
      play({ mode: 'vs', ...session })
    },
  })
}

const actions = {
  cpu: () => play({ mode: 'cpu', seed: Math.floor(Math.random() * 1e9), me: 0, names: [playerName(), TEXTS.cpuName] }),
  vs: () => lobby(),
  join: () => {
    const room = roomInput.value.trim().toUpperCase()
    if (room) lobby(room)
    else roomInput.focus()
  },
}

menu.addEventListener('click', (e) => actions[e.target.closest('[data-action]')?.dataset.action]?.())
roomInput.addEventListener('keydown', (e) => e.key === 'Enter' && actions.join())

// Fanúšik cez QR z hernej obrazovky: ?watch=KOD → emoji pad
const watching = new URLSearchParams(location.search).get('watch')
if (watching) {
  showScreen('screen-watch')
  showWatch($('#screen-watch'), { room: watching })
}

// Pozvánka cez QR: ?room=KOD → predvyplň kód a zvýrazni Pripojiť sa
const invited = new URLSearchParams(location.search).get('room')
if (invited) {
  roomInput.value = invited.toUpperCase()
  menu.querySelector('.menu').classList.add('joining')
  nameInput.focus()
}
