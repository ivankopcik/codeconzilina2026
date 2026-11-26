// Lobby pre VS Online: hostiteľ vytvorí miestnosť (kód + QR), hosť sa pripojí cez ?room=KOD.
import QRCode from 'qrcode'
import { COLORS, TEXTS } from './config.js'
import { connect } from './net.js'
import './lobby.css'

const T = {
  connecting: 'Pripájam sa k serveru',
  joining: (room) => `Pripájam sa do ${room}`,
  waiting: 'Čakám na súpera',
  invite: 'Naskenuj QR a hraj proti mne!',
  copy: 'Kopírovať odkaz',
  copied: 'Skopírované!',
  back: '← Späť do menu',
  errorTitle: 'Ups!',
  lost: 'Spojenie so serverom sa prerušilo',
}
const QR_SIZE = 280
const DOTS = '<span class="lobby-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>'

export function showLobby(container, { name, room, onStart }) {
  container.innerHTML = `
    <div class="card lobby">
      <h2 class="title lobby-title">${TEXTS.modes.vs}</h2>
      <div class="lobby-body"></div>
      <p class="lobby-status" role="status"></p>
      <button class="btn lobby-back" type="button">${T.back}</button>
    </div>`
  const $ = (sel) => container.querySelector(sel)
  const [title, body, status] = ['.lobby-title', '.lobby-body', '.lobby-status'].map($)
  $('.lobby-back').addEventListener('click', () => (location.href = location.pathname))

  let net = null
  let started = false

  const setStatus = (text, state = '') => {
    status.className = `lobby-status${state && ` is-${state}`}`
    status.textContent = text
    if (state === 'waiting') status.insertAdjacentHTML('beforeend', DOTS)
  }

  const fail = (err) => {
    if (started) return
    net?.close()
    title.textContent = T.errorTitle
    body.replaceChildren()
    setStatus(err?.message || T.lost, 'error')
  }

  const go = (data) => {
    if (started) return
    started = true
    onStart({ net, ...data })
  }

  async function open() {
    net = await connect()
    net.onLeft(() => fail(new Error(T.lost)))
  }

  async function host() {
    setStatus(T.connecting, 'waiting')
    await open()
    net.onStart(({ seed, names }) => go({ seed, me: 0, names }))
    const { room: code } = await net.create(name)
    const url = `${location.origin}/?room=${code}`
    body.innerHTML = `
      <div class="lobby-code" aria-label="Kód miestnosti">${code}</div>
      <canvas class="lobby-qr"></canvas>
      <p class="lobby-invite">${T.invite}</p>
      <a class="lobby-link" href="${url}" target="_blank" rel="noopener">${url.replace(/^https?:\/\//, '')}</a>
      <button class="btn btn-primary lobby-copy" type="button">${T.copy}</button>`
    $('.lobby-copy').addEventListener('click', (e) => copyLink(e.currentTarget, url))
    setStatus(T.waiting, 'waiting')
    await QRCode.toCanvas($('.lobby-qr'), url, {
      width: QR_SIZE,
      margin: 2,
      color: { dark: COLORS.bg, light: '#ffffff' },
    })
  }

  async function guest() {
    setStatus(T.joining(room), 'waiting')
    await open()
    const { seed, names } = await net.join(room, name)
    go({ seed, me: 1, names })
  }

  ;(room ? guest : host)().catch(fail)
}

async function copyLink(btn, url) {
  try {
    await navigator.clipboard.writeText(url)
    btn.textContent = T.copied
    setTimeout(() => (btn.textContent = T.copy), 1500)
  } catch {
    window.prompt(T.copy, url)
  }
}
