import './results.css'
import { HASHTAG, SITE_URL, TEXTS, COLORS, HITS_TO_WIN, LEADERBOARD_SIZE } from './config.js'

const CARD = { W: 1080, H: 1350 }
const FILE_NAME = 'vianocna-gulovacka.png'
const MODE_COLOR = { cpu: COLORS.green, vs: COLORS.red } // zhodné s .mode-cpu / .mode-vs v results.css
const MEDALS = ['🥇', '🥈', '🥉']
const HOST = SITE_URL.replace(/^https?:\/\//, '')
const EVENT = 'CODECON Žilina 2026'

const ACTIONS = [
  { id: 'instagram', label: '📸 Instagram', cls: 'res-ig' },
  { id: 'facebook', label: '📘 Facebook', cls: 'res-fb' },
  { id: 'share', label: '📲 Iné appky' },
  { id: 'download', label: '⬇️ Stiahnuť obrázok' },
  { id: 'copy', label: '📋 Kopírovať text' },
]
const FB_SHARER = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}&hashtag=${encodeURIComponent(HASHTAG)}`
const IG_WEB = 'https://www.instagram.com/'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const pct = (a) => `${Math.round((a || 0) * 100)} %`
const mmss = (sec = 0) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
const scoreText = (score) => esc(Array.isArray(score) ? score.join(':') : score)

// Odvodené hodnoty z výsledku – jeden zdroj pre UI, kartu aj text na zdieľanie
function view(r) {
  const me = r.me ?? 0
  const opp = 1 - me
  return {
    me,
    opp,
    myName: r.names?.[me] || TEXTS.defaultName,
    oppName: r.names?.[opp] || TEXTS.cpuName,
    my: r.score?.[me] ?? 0,
    their: r.score?.[opp] ?? 0,
    modeLabel: TEXTS.modes[r.mode] || r.mode,
    headline: r.won ? '🏆 Výhra!' : '☃️ Prehra…',
    word: r.won ? 'VÝHRA!' : 'PREHRA',
    stats: [
      { icon: '🎯', label: 'Presnosť', value: pct(r.accuracy) },
      { icon: '❄️', label: 'Hody', value: r.throws ?? 0 },
      { icon: '⏱️', label: 'Čas', value: mmss(r.durationSec) },
    ],
  }
}

function shareText(r, v) {
  return `${r.won ? '🏆 Vyhral som' : '☃️ Prehral som'} vo Vianočnej guľovačke (${v.modeLabel}): ` +
    `${v.myName} ${v.my}:${v.their} ${v.oppName}, presnosť ${pct(r.accuracy)}. ${HASHTAG} ${SITE_URL}`
}

// ---------- Karta 1080×1350 na canvas ----------
function drawCard(r, v) {
  const { W, H } = CARD
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H })
  const ctx = c.getContext('2d')
  const font = getComputedStyle(document.body).fontFamily

  const text = (str, x, y, size, color, { weight = 900, maxW = W - 120, glow } = {}) => {
    let s = size
    do {
      ctx.font = `${weight} ${s}px ${font}`
    } while (ctx.measureText(str).width > maxW && (s -= 4) > 16)
    ctx.fillStyle = color
    ctx.shadowColor = glow || 'transparent'
    ctx.shadowBlur = glow ? 40 : 0
    ctx.fillText(str, x, y)
    ctx.shadowBlur = 0
  }
  const dots = (n, color, [rMin, rMax], maxY) => {
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = 0.3 + Math.random() * 0.7
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(Math.random() * W, Math.random() * maxY, rMin + Math.random() * (rMax - rMin), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, COLORS.bg)
  bg.addColorStop(0.7, COLORS.bg2)
  bg.addColorStop(1, '#3b5199')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  dots(45, COLORS.gold, [1.5, 3.5], H * 0.45)
  dots(140, COLORS.snow, [2, 8], H)

  // zasnežená zem
  ctx.fillStyle = COLORS.snow
  ctx.beginPath()
  ctx.moveTo(0, H)
  ctx.lineTo(0, H - 170)
  ctx.quadraticCurveTo(W * 0.3, H - 260, W * 0.55, H - 185)
  ctx.quadraticCurveTo(W * 0.8, H - 120, W, H - 210)
  ctx.lineTo(W, H)
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  text(`❄️ ${TEXTS.title} ❄️`, W / 2, 120, 76, COLORS.text)

  // odznak režimu
  ctx.font = `900 56px ${font}`
  const bw = ctx.measureText(v.modeLabel).width + 110
  ctx.fillStyle = MODE_COLOR[r.mode] || COLORS.gold
  ctx.beginPath()
  ctx.roundRect(W / 2 - bw / 2, 190, bw, 100, 50)
  ctx.fill()
  text(v.modeLabel.toUpperCase(), W / 2, 242, 56, COLORS.bg)

  text(v.word, W / 2, 410, 160, r.won ? COLORS.gold : COLORS.snow, { glow: r.won ? COLORS.gold : COLORS.bg2 })

  text(v.myName, W * 0.25, 560, 60, COLORS.players[v.me], { weight: 800, maxW: W * 0.44 })
  text(v.oppName, W * 0.75, 560, 60, COLORS.players[v.opp], { weight: 800, maxW: W * 0.44 })
  text(`${v.my} : ${v.their}`, W / 2, 720, 250, COLORS.text, { glow: 'rgba(255,255,255,0.35)' })

  text(v.stats.map((s) => `${s.icon} ${s.value}`).join('    '), W / 2, 880, 54, COLORS.snow, { weight: 800 })
  text(HASHTAG, W / 2, 1010, 96, COLORS.gold, { glow: COLORS.gold })

  text(HOST, W / 2, H - 100, 46, COLORS.bg, { weight: 800 })
  text(EVENT, W / 2, H - 45, 42, COLORS.red)
  return c
}

// ---------- Obrazovka ----------
export function showResults(container, result, { onRestart } = {}) {
  const r = result || {}
  const v = view(r)
  const modes = Object.keys(TEXTS.modes)

  container.innerHTML = `
  <div class="card results">
    <span class="res-mode mode-${esc(r.mode)}">${esc(v.modeLabel)}</span>
    <h1 class="title res-title ${r.won ? 'win' : 'lose'}">${v.headline}</h1>
    <p class="subtitle">${r.won ? `Trafil si súpera ${HITS_TO_WIN}× ako prvý!` : 'Nabudúce to vyjde – skús to znova!'}</p>
    <div class="res-score">
      <span class="res-name" style="color:${COLORS.players[v.me]}">${esc(v.myName)}</span>
      <b>${v.my} : ${v.their}</b>
      <span class="res-name" style="color:${COLORS.players[v.opp]}">${esc(v.oppName)}</span>
    </div>
    <div class="res-stats">
      ${v.stats.map((s) => `<div><b>${s.value}</b><small>${s.icon} ${s.label}</small></div>`).join('')}
    </div>

    <img class="res-preview" alt="Karta s výsledkom na zdieľanie">
    <div class="res-actions">
      ${ACTIONS.map((a) => `<button class="btn ${a.cls || ''}" data-act="${a.id}">${a.label}</button>`).join('')}
    </div>
    <p class="res-msg" aria-live="polite"></p>
    <p class="res-info">Zdieľaj kartu na Instagrame s <b>${HASHTAG}</b> alebo sa zapoj e-mailom a vyhraj poukážky na elektroniku, merch alebo VIP kreslo na ďalšom CODECONe!</p>

    <form class="res-form">
      <h2 class="res-h">🎁 Zapoj sa do súťaže</h2>
      <input class="input" name="name" required maxlength="30" placeholder="Meno" value="${esc(v.myName)}">
      <input class="input" name="email" type="email" required placeholder="tvoj@email.sk" autocomplete="email">
      <label class="res-check"><input type="checkbox" name="consent" required>
        <span>Súhlasím so spracovaním e-mailu na účely súťaže.</span></label>
      <button class="btn btn-primary" type="submit">Zapojiť sa</button>
      <p class="res-form-msg" aria-live="polite"></p>
    </form>

    <section class="res-board">
      <h2 class="res-h">🏅 Rebríček</h2>
      <div class="res-tabs">
        ${modes.map((m) => `<button class="btn res-tab mode-${m}" data-mode="${m}">${esc(TEXTS.modes[m])}</button>`).join('')}
      </div>
      <div class="res-table"></div>
    </section>

    <button class="btn btn-primary res-restart" data-act="restart">🔄 Hrať znova</button>
  </div>`
  container.scrollTop = 0

  const $ = (sel) => container.querySelector(sel)
  const msg = $('.res-msg')
  const flash = (text) => {
    msg.textContent = text
    clearTimeout(flash.t)
    flash.t = setTimeout(() => (msg.textContent = ''), 3000)
  }

  // karta – prekresli po načítaní fontu
  // karta aj PNG súbor sa pripravia vopred, aby share bežal synchrónne v kliknutí (iOS Safari inak zablokuje)
  let canvas = drawCard(r, v)
  let file = null
  const prepare = () => {
    $('.res-preview').src = canvas.toDataURL('image/png')
    canvas.toBlob((b) => (file = new File([b], FILE_NAME, { type: 'image/png' })), 'image/png')
  }
  prepare()
  document.fonts?.ready.then(() => {
    canvas = drawCard(r, v)
    prepare()
  })

  const text = shareText(r, v)
  const download = () => Object.assign(document.createElement('a'), { href: canvas.toDataURL('image/png'), download: FILE_NAME }).click()
  const copyText = () => navigator.clipboard?.writeText(text).then(() => true, () => false) ?? Promise.resolve(false)
  const canShareFile = () => file && navigator.canShare?.({ files: [file] })
  // natívne zdieľanie obrázka (mobil → výber appky), inak stiahnutie
  const shareImage = (withText) =>
    canShareFile()
      ? navigator.share(withText ? { files: [file], text } : { files: [file] }).catch((e) => e.name !== 'AbortError' && download())
      : (download(), false)

  const actions = {
    // Instagram nevie prijať text z webu: popis s hashtagom dáme do schránky, obrázok cez share sheet
    async instagram() {
      const copied = copyText()
      const shared = shareImage(false)
      if (shared === false) window.open(IG_WEB, '_blank', 'noopener')
      flash(
        (await copied)
          ? `📸 Popis s ${HASHTAG} je v schránke, v Instagrame ho vlož do popisku (podrž → Vložiť)`
          : `📸 Pridaj obrázok na Instagram a označ ${HASHTAG}`,
      )
    },
    // Facebook: odkaz na hru s hashtagom, text s výsledkom je v schránke na vloženie
    async facebook() {
      window.open(FB_SHARER, '_blank', 'noopener,width=640,height=560')
      flash((await copyText()) ? `📘 Text s výsledkom a ${HASHTAG} je v schránke, vlož ho do príspevku` : `📘 Zdieľaj s ${HASHTAG}`)
    },
    share() {
      if (shareImage(true) === false) flash(`Obrázok stiahnutý, pridaj ho s ${HASHTAG} 📸`)
    },
    download() {
      download()
      flash('Obrázok stiahnutý ⬇️')
    },
    async copy() {
      flash((await copyText()) ? 'Skopírované! ✅' : 'Kopírovanie zlyhalo 😕')
    },
    restart: () => onRestart?.(),
  }
  container.querySelector('.results').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act
    if (act) actions[act]()
    const tab = e.target.closest('[data-mode]')?.dataset.mode
    if (tab) loadBoard(tab)
  })

  // rebríček
  let boardMode = modes.includes(r.mode) ? r.mode : modes[0]
  async function loadBoard(mode) {
    boardMode = mode
    container.querySelectorAll('.res-tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode))
    const box = $('.res-table')
    box.innerHTML = '<p class="res-muted">Načítavam…</p>'
    let html
    try {
      const res = await fetch(`/api/leaderboard?mode=${encodeURIComponent(mode)}`)
      if (!res.ok) throw new Error(res.status)
      const rows = (await res.json()).slice(0, LEADERBOARD_SIZE)
      html = rows.length
        ? `<table><thead><tr><th>#</th><th>Meno</th><th>Skóre</th><th>Presnosť</th><th>Výhra</th></tr></thead><tbody>
          ${rows.map((x, i) => `<tr><td>${MEDALS[i] || i + 1 + '.'}</td><td class="res-td-name">${esc(x.name)}</td>
            <td><b>${scoreText(x.score)}</b></td><td>${pct(x.accuracy)}</td><td>${x.won ? '✓' : ''}</td></tr>`).join('')}
          </tbody></table>`
        : '<p class="res-muted">Zatiaľ prázdne – buď prvý! ❄️</p>'
    } catch {
      html = '<p class="res-muted">Rebríček zatiaľ nedostupný</p>'
    }
    if (boardMode === mode) box.innerHTML = html
  }
  loadBoard(boardMode)

  // súťaž e-mailom
  const form = $('.res-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(form)
    const btn = form.querySelector('[type=submit]')
    const out = form.querySelector('.res-form-msg')
    btn.disabled = true
    out.textContent = 'Odosielam…'
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name').trim(),
          email: fd.get('email').trim(),
          mode: r.mode,
          won: !!r.won,
          score: [v.my, v.their],
          accuracy: r.accuracy ?? 0,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status)
      form.innerHTML = '<p class="res-thanks">Ďakujeme, si v súťaži! 🎁</p>'
      loadBoard(boardMode)
    } catch {
      out.textContent = 'Odoslanie zlyhalo, skús to prosím znova.'
      btn.disabled = false
    }
  })
}
