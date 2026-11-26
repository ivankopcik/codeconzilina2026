import './commentator.css'
import { isMuted } from '../sfx.js'
const SPEECH_ENABLED = false // TTS z prehliadača je robotický, hlášky sú len v bubline

// Komentátor zápasu „Mrázik“: roast hlášky ako bublina + voliteľne TTS.
const LINES = {
  start: [
    'Vitajte v Novej synagóge! {n} proti {o}, sneh je pripravený!',
    '{n} verzus {o}. Takú bitku Žilina nevidela od Jánošíka!',
    'Dámy a páni, guľovačka roka! {n} a {o} na ihrisku!',
    '{n} sa rozcvičuje, {o} ešte hľadá rukavice.',
    'Mrázik hlási: vietor z Malej Fatry, nálada ako na CODECONe!',
    '{n} proti {o}. Kto prehrá, deployuje v piatok!',
    'Štart! {n} a {o}, nech lietajú gule, nie bugy!',
  ],
  hit: [
    'BUM! {n} trafil {o} ako bug v produkcii!',
    'Zásah! {o} teraz vyzerá ako snehuliak z Terchovej!',
    '{n} mieri lepšie než Jánošík valaškou!',
    'Priamy zásah! {o}, to bude bolieť až do Silvestra.',
    '{o} to schytal rovno do čiapky s brmbolcom!',
    'Headshot! {n} mieri presnejšie ako AI autocomplete.',
    'Ajaj, {o}! Ten sneh ti ide do commit histórie.',
    'Perfektný hod! {n} by trafil aj vrchol Chleba.',
  ],
  cpuHit: [
    'Počítač trafil {o}. AI ti berie prácu aj v guľovačke!',
    'Skynet sa prebudil a začal snehovými guľami.',
    'Umelá inteligencia 1, prirodzená hlúposť 0.',
    '{o}, toto je ten moment, keď sa AI učí z tvojich chýb.',
    'Počítač hlási: zásah. Ďalší krok: ovládnutie Žiliny.',
    'GPU zohriate, {o} zasnežený. Pokrok nezastavíš!',
    'Robot trafil. {o}, skús sa mu ospravedlniť vopred.',
  ],
  block: [
    'Snehuliak to schytal! Hrdina dňa, bez platu.',
    'Snehuliak zachránil {o}. Dajte mu mrkvu navyše!',
    '{n} trafil snehuliaka. Aspoň niekto dnes dostal bod… nie.',
    'Snehuliak: jediný tester, ktorý reálne zachytil chybu.',
    'Firewall zo snehu funguje! {o} je v bezpečí.',
    'Snehuliak bráni ako Jánošík svoju družinu!',
    '{n}, snehuliak ti nič neurobil. Zatiaľ.',
  ],
  splash: [
    '{n} trafil zem. Sneh je spokojný, {o} tiež.',
    'Pľuf! Do snehu, ako pull request bez review.',
    '{n}, cieľ je {o}, nie podlaha!',
    'Krásny hod… do záveja. Aj tak sa ráta snaha.',
    'Guľa pristála skôr ako deadline. To je novinka.',
    '{n} zalieva trávnik snehom. Ekologické!',
    'Zem trafená na sto percent. Aspoň niečo.',
  ],
  out: [
    '{n} hodil guľu rovno do Martina!',
    'Tá guľa letí na Malú Fatru. Pošlite záchranku!',
    'Guľa opustila mapu. Aj Žilinu. Aj Slovensko.',
    '{n} si spletol {o} s Terchovou.',
    'Ďakujeme za hod, guľa je teraz v cloude.',
    'Wow, {n}! Tá guľa ide doručiť darčeky do Laponska.',
    'Hod out of bounds. Ako index v poli o jedna vedľa.',
  ],
  matchpoint: [
    '{n} má štyri zásahy! Ešte jedna… FINISH HIM!',
    'Matchball pre {n}! {o}, modli sa k Mrázikovi!',
    'Štyri na tabuli! {n}, dokonči to!',
    '{o} visí na vlásku! Ešte jedna guľa a koniec!',
    '{n} je jeden zásah od slávy. FINISH HIM!',
    'Napätie ako pred piatkovým deployom! {n} má štyri!',
  ],
  win: [
    'K.O.! {n} vyhráva! FATALITY!',
    '{n} WINS! {o}, choď sa zohriať na punč.',
    'FATALITY! {o} je oficiálne snehuliak.',
    'Koniec! {n} je kráľ guľovačky v Novej synagóge!',
    '{n} vyhral! Jánošík by bol hrdý.',
    'FLAWLESS VICTORY! Alebo aspoň victory. {n} vyhráva!',
    'K.O.! {o}, nabudúce skús Ctrl+Z.',
  ],
  combo: [
    'KOMBO! {n} trafil dvakrát za sebou!',
    '{n} sa rozbehol! {o} nestíha uhýbať.',
    'Dva zásahy v rade! {n} je v ráži!',
  ],
  brutality: [
    'BRUTALITY! {n} rozoberá {o} na snehové vločky!',
    '{n} nepozná zľutovanie! BRUTALITY!',
    'Séria pokračuje! {o} potrebuje lopatu.',
  ],
  breaker: [
    'COMBO BREAKER! {n} zastavil sériu {o}!',
    '{n} prerušil kombo! {o} ide späť na nulu.',
  ],
}

// Nahrávky hlasom Ivana Kopčíka (ElevenLabs eleven_v4), text v bubline = presne to, čo znie
const VOICE = {
  start: [['start1', 'Dámy a páni, guľovačka roka! Nech lietajú gule, nie bugy!']],
  hit: [['hit1', 'BUM! Zásah ako bug v produkcii!'], ['hit2', 'Headshot! Presnejšie ako AI autocomplete.']],
  cpuHit: [['cpuhit1', 'Umelá inteligencia 1, prirodzená hlúposť 0.']],
  block: [['block1', 'Snehuliak to schytal! Hrdina dňa, bez platu.'], ['block2', 'Snehuliak, jediný tester, ktorý reálne zachytil chybu.']],
  splash: [['splash1', 'Pľuf! Do snehu, ako pull request bez review.'], ['splash2', 'Zem trafená na sto percent. Aspoň niečo.']],
  out: [['out1', 'Tá guľa letí na Malú Fatru! Pošlite záchranku!'], ['out2', 'Ďakujeme za hod, guľa je teraz v cloude.']],
  matchpoint: [['matchpoint1', 'Štyri na tabuli! Ešte jedna… FINISH HIM!']],
  win: [['win1', 'K.O.! Máme víťaza! FATALITY!']],
  combo: [['combo1', 'Dva zásahy za sebou! KOMBO!'], ['combo2', 'KOMBO! Ide to ako po masle!']],
  brutality: [['brutality1', 'Tri zásahy za sebou! BRUTALITY!']],
  breaker: [['breaker1', 'COMBO BREAKER! Séria je fuč!']],
}
const VOICE_CHANCE = 0.6 // inak textová hláška s menami (bez zvuku)
const VOICE_ALWAYS = ['start', 'matchpoint', 'win', 'combo', 'brutality', 'breaker']
const COMBO_MS = 1900
const clips = {} // načítané až po prvom geste (autoplay policy)
let playing = null // nová hláška preruší starú

function loadClips() {
  Object.values(VOICE).flat().forEach(([id]) => {
    if (clips[id]) return
    const a = new Audio(`/voice/${id}.mp3`)
    a.preload = 'auto'
    clips[id] = a
  })
}

// prvé gesto kdekoľvek v appke (napr. klik na „Hraj“) odomkne a prednačíta nahrávky
if (typeof window !== 'undefined') window.addEventListener('pointerdown', loadClips, { once: true })

function playClip(id) {
  try {
    playing?.pause()
    if (isMuted()) return
    loadClips()
    const a = clips[id]
    a.currentTime = 0
    playing = a
    a.play().catch(() => {})
  } catch {}
}

const EMOJI_RE = /\p{Extended_Pictographic}/gu
const SHOW_MS = 3500
const LS_KEY = 'tts'

function lsGet() {
  try { return localStorage.getItem(LS_KEY) } catch { return null }
}
function lsSet(v) {
  try { localStorage.setItem(LS_KEY, v) } catch {}
}

export function createCommentator(container, { names = ['Hráč 1', 'Hráč 2'], me = 0, mode = 'cpu' } = {}) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  const stored = lsGet()
  let ttsOn = stored != null ? stored === '1' : !!window.matchMedia?.('(pointer: fine)').matches
  let voice // undefined = ešte nehľadaný, null = nenájdený
  let hideTimer = 0
  const lastIdx = {}

  const root = document.createElement('div')
  root.className = 'cm-root'
  root.innerHTML = `
    <div class="cm-bubble" hidden><div class="cm-label">🎙️ Mrázik</div><div class="cm-text"></div></div>
    <div class="cm-combo" hidden><b></b><span></span><i></i></div>`
  const bubble = root.querySelector('.cm-bubble')
  const comboEl = root.querySelector('.cm-combo')
  let comboTimer = 0

  // Mortal Kombat banner na strane strelca: „3 HIT COMBO! BRUTALITY!“ / „COMBO BREAKER!“
  function showCombo(shooter, combo, breaker) {
    const [top, mid, low] = breaker ? ['COMBO', 'BREAKER!', ''] : [`${combo} HIT`, 'COMBO!', combo > 2 ? 'BRUTALITY!' : '']
    ;[...comboEl.children].forEach((el, i) => (el.textContent = [top, mid, low][i]))
    comboEl.className = `cm-combo p${shooter}`
    comboEl.hidden = false
    void comboEl.offsetWidth
    comboEl.classList.add('cm-slam')
    clearTimeout(comboTimer)
    comboTimer = setTimeout(() => (comboEl.hidden = true), COMBO_MS)
  }
  const textEl = root.querySelector('.cm-text')
  container.appendChild(root)

  // iOS: speech sa musí odomknúť v rámci user gesta
  const unlock = () => {
    loadClips()
    if (SPEECH_ENABLED) try { synth?.speak(new SpeechSynthesisUtterance('')) } catch {}
  }
  window.addEventListener('pointerdown', unlock, { once: true })

  function pickVoice() {
    if (voice) return voice
    const voices = synth?.getVoices() || []
    voice = voices.find((v) => /^sk/i.test(v.lang)) || voices.find((v) => /^cs/i.test(v.lang)) || null
    return voice
  }

  function speak(text) {
    if (!SPEECH_ENABLED) return // prehliadačový TTS znie príliš roboticky, Mrázik len píše
    if (!ttsOn || !synth || isMuted()) return // hlas stíši aj globálne #mute
    const v = pickVoice()
    if (!v) return
    const clean = text.replace(EMOJI_RE, '').replace(/\s+/g, ' ').trim()
    if (!clean) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(clean)
    u.voice = v
    u.lang = v.lang
    u.rate = 1.05
    synth.speak(u)
  }

  function pick(cat) {
    const list = LINES[cat]
    let i = Math.floor(Math.random() * list.length)
    if (list.length > 1 && i === lastIdx[cat]) i = (i + 1) % list.length
    lastIdx[cat] = i
    return list[i]
  }

  function say(type, { shooter, combo = 0, breaker = false } = {}) {
    if (!LINES[type]) return
    const s = type === 'start' || shooter == null ? 0 : shooter
    if (combo || breaker) showCombo(s, combo, breaker)
    let cat = type
    if (type === 'hit' && mode === 'cpu' && s !== me && Math.random() < 0.5) cat = 'cpuHit'
    const voiced = VOICE[cat] && !isMuted() && (VOICE_ALWAYS.includes(cat) || Math.random() < VOICE_CHANCE)
    const [clip, voicedText] = voiced ? VOICE[cat][Math.floor(Math.random() * VOICE[cat].length)] : []
    if (voiced) playClip(clip)
    const text = voicedText || pick(cat)
      .replaceAll('{n}', names[s] ?? '')
      .replaceAll('{o}', names[1 - s] ?? '')

    textEl.textContent = text
    bubble.hidden = false
    // reštart animácie
    bubble.classList.remove('cm-show')
    void bubble.offsetWidth
    bubble.classList.add('cm-show')
    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      bubble.classList.remove('cm-show')
      bubble.hidden = true
    }, SHOW_MS)

    speak(text)
  }

  function destroy() {
    clearTimeout(hideTimer)
    clearTimeout(comboTimer)
    window.removeEventListener('pointerdown', unlock)
    root.remove() // reč nerušíme, nech K.O. hláška dobehne aj na obrazovke výsledkov
  }

  return { say, destroy }
}
