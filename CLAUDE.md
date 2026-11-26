# CodeCon Žilina 2026 – AI Battle (Súboj TITANOV)

Živá súťaž na TITANS STAGE, Nová synagóga Žilina, 2026-11-26.
Repo: https://github.com/ivankopcik/codeconzilina2026.git (`origin`, vetva `main`, verejné)

## Harmonogram

- **12:00** generálka, kde dostaneme zadanie
- **13:00–13:55** battle:
  1. úvod (max 10 min)
  2. **live coding: 30 minút**, presný štart ohlási moderátor (cca 13:00–13:10)
  3. demo: **max 3 minúty**
  4. hlasovanie publika krikom (hlukomer) a vyhlásenie víťaza

Koniec = štart + 30 min. **5 minút pred koncom** už žiadne nové funkcie, len doladenie, README a finálny push s deployom.

## Výstup a hodnotenie

- Výstupom je **webová aplikácia dostupná cez QR kód**, teda musí bežať na verejnej URL.
- Hodnotí sa: **funkčnosť, kreativita, práca s AI, estetika a cool faktor**. Všetko je dovolené. Vyhráva ten, koho publikum prekričí.
- Z toho vyplýva:
  - **Mobile-first**: publikum appku otvorí na mobile cez QR, takže musí byť dobrá na telefóne.
  - **Wow efekt hneď**: žiadny login ani onboarding, hlavná funkcia hneď na úvodnej obrazovke. Demo trvá len 3 minúty.
  - **Estetika**: moderný vzhľad, výrazné farby a animácie. Nech to vyzerá hotovo, nie ako prototyp.
  - **Interakcia s publikom** je veľké plus, keďže ľudia budú mať appku v mobile.
  - Ak sa to hodí k zadaniu, zapoj **AI priamo do appky**, aby bola práca s AI viditeľná.

## Zadanie: Vianočná guľovačka

Prehliadačová hra. Dvaja hráči stoja oproti sebe na zasneženom ihrisku a striedajú sa v hádzaní snehových gúľ. Nastavujú uhol a silu hodu, do cesty im fúka vietor a stoja tam snehuliaci. **Kto prvý trafí súpera 5×, vyhráva.**

Hra musí vedieť:
- hod s nastavením uhla a sily
- vietor a snehuliakov ako prekážky
- hru proti počítaču
- hru proti inému hráčovi online (VS)
- výsledky na konci hry, ktoré sa dajú zdieľať, **zvlášť z hry proti počítaču a zvlášť z VS**
- cez zdieľanie výsledkov sa ľudia zapoja do súťaže na **Instagrame s hashtagom alebo cez e-mail** (ceny: poukážky na elektroniku, merch, hlavná cena VIP kreslo na ďalšom CODECONe)

Demo (max 3 min): hra, **feature s publikom** (človek z publika sa pripojí cez QR do VS hry) a výsledky na zdieľanie. Moderátori ohlásia 20, 10, 5 a poslednú minútu.

Hodnotí sa:
- **funkčnosť:** hod s uhlom a silou, vietor, hra proti počítaču, VS online, výsledky na zdieľanie
- **kreativita:** vianočná atmosféra, postavičky, prekážky, nápady navyše
- **práca s AI:** ako efektívne využívaš AI agentov
- **estetika:** UI, animácie, čitateľnosť na pódiu
- **cool faktor:** vibe, hrateľnosť, detaily

## Architektúra (kontrakt pre agentov)

**Stack:** Vite + vanilla JS (bez TS, bez frameworku), Canvas 2D, backend Node + `ws`. Súbory: root `package.json` (vite, qrcode), `vite.config.js` (dev proxy `/api` → `localhost:3000`, `ws: true`), `server/package.json` (ws, `"type": "module"`).

| Súbor | Vlastník | Obsah |
|---|---|---|
| `index.html`, `src/main.js`, `src/style.css`, `src/config.js`, `vite.config.js`, `package.json` | hlavný agent | obrazovky, menu, routing, design tokeny, zdieľané konštanty |
| `src/game/physics.js`, `game.js`, `ai.js`, `rng.js` | agent HRA | fyzika, ťahy, vstup, CPU súper, škálovanie canvasu |
| `src/game/render.js`, `src/gfx/*`, `public/assets/*` | **session GRAFIKA** (iná Claude session) | všetko kreslenie: scéna, postavičky, snehuliaci, efekty, HUD. Hodnoty tokenov v `style.css` môže meniť. |
| `server/*`, `src/net.js`, `src/lobby.js`, `src/lobby.css` | agent ONLINE | WebSocket miestnosti, REST pre súťaž, lobby s QR |
| `src/results.js`, `src/results.css` | agent VÝSLEDKY | obrazovka výsledkov, karta na zdieľanie, e-mail súťaž, rebríček |

**Session GRAFIKA:** pracuje v tom istom priečinku a mení len svoje súbory z tabuľky. Necommituje a nedeployuje, commit a deploy robí hlavná session priebežne. Obrázky a sprity dáva do `public/assets/` (v kóde cesta `/assets/...`), kresliace helpery do `src/gfx/`. Render musí zostať rýchly aj na mobile. Lokálny náhľad: `npm run dev`.

**Zdieľané (`src/config.js`, vlastní hlavný agent):** `WORLD = { W: 1600, H: 900, GROUND_Y: 780 }`, `HITS_TO_WIN = 5`, `HASHTAG = '#CodeconGulovacka'`, `SITE_URL`, `COLORS`, `TEXTS` (slovenské texty). CSS premenné v `style.css` (`--bg`, `--fg`, `--accent`, `--accent-2`, `--card`, `--radius`, `--font`) a triedy `.btn`, `.btn-primary`, `.card`, `.input`, `.title`. Moduly ich používajú a vlastné CSS píšu len do svojho `.css` súboru, ktorý importujú v JS.

**Obrazovky** (`index.html`): `#screen-menu`, `#screen-lobby`, `#screen-game` (obsahuje `<canvas id="game">`), `#screen-results`. Prepína ich `showScreen(id)` v `main.js`.

**API modulov:**
```js
// src/game/game.js (HRA)
startGame({ canvas, mode /* 'cpu'|'vs' */, seed, me /* 0|1 */, names /* [n0,n1] */, net /* len vs */, onEnd }) → { destroy() }
// onEnd(result), result = { mode, won, names, me, score: [s0, s1], throws, hits, accuracy /* 0..1 */, durationSec }
// cpu: me = 0 (vľavo), počítač = 1. Hráč 0 stojí vľavo a začína, ťahy sa striedajú.

// src/net.js (ONLINE)
connect() → Promise<net>
net.create(name) → Promise<{ room, seed, me: 0 }>
net.join(room, name) → Promise<{ room, seed, me: 1, names }>
net.onStart(cb({ seed, names }))
net.sendThrow({ angle, power }); net.onThrow(cb({ angle, power })); net.onLeft(cb())

// src/lobby.js (ONLINE)
showLobby(container, { name, room /* ak sa pripája cez ?room= */, onStart({ net, seed, me, names }) })
// vytvorí miestnosť, ukáže veľký kód, QR a link ${SITE_URL}/?room=KOD a čaká na súpera

// src/results.js (VÝSLEDKY)
showResults(container, result, { onRestart })
```

**Render kontrakt (HRA → GRAFIKA):** `game.js` volá každý frame `render(ctx, state)` z `src/game/render.js`. `ctx` je už preškálovaný na logické súradnice 1600×900 (y rastie nadol, zem je na `WORLD.GROUND_Y`). Render nič nemení v `state`, ale môže mať vlastný vnútorný stav (sneženie, častice, parallax).
```js
state = {
  t,                     // čas v sekundách
  mode, me, turn,        // 'cpu'|'vs', môj index, index hráča na ťahu
  phase,                 // 'aim' | 'flying' | 'wait' (čaká na CPU/súpera) | 'over'
  message,               // text pre hráča, napr. "Na ťahu: Ivan", "Čakám na súpera…", "Vyhral Ivan!"
  players: [{ x, name, hits, lastThrowT, lastHitT }],   // stoja na GROUND_Y, hitbox podľa PLAYER_HITBOX
  snowmen: [{ x, parts: [{ x, y, r }] }],               // kolízne kruhy (absolútne), render ich môže kresliť ako model
  ball: { x, y, vx, vy } | null,
  trail: [{ x, y }],
  aim: { angle, power, preview: [{ x, y }] } | null,   // angle v rad (0 = vodorovne k súperovi, kladný = hore), power 0..1
  wind,                  // px/s², normalizuj cez WIND_MAX z config.js (záporný = fúka doľava)
  effects: [{ type: 'hit' | 'splash' | 'block', x, y, age }],  // age v s, game ich maže po 1.5 s
  shake,                 // 0..1 sila otrasu kamery
}
```
Hráč 0 stojí vľavo, hráč 1 vpravo, pozície sú v `PLAYERS` v `config.js`. HUD (skóre ako 5 guličiek pre každého, vietor, `message`) kreslí render.

**Online synchronizácia je deterministická:** posiela sa len `{ angle, power }`. Vietor pre každý ťah a rozmiestnenie snehuliakov počítajú oba klienti zo spoločného `seed` (`rng.js` = mulberry32, vietor ťahu `t` z `seed + t * 9973`). Fyzika beží s pevným krokom `dt = 1/120`, takže obe strany uvidia rovnaký výsledok.

**WebSocket** `wss://<host>/api/ws`, JSON správy: `{t:'create',name}` → `{t:'created',room,seed,me:0}` · `{t:'join',room,name}` → `{t:'joined',room,seed,me:1,names}` + obom `{t:'start',seed,names}` · `{t:'throw',angle,power}` → druhému · odpojenie → druhému `{t:'left'}`. Kód miestnosti: 4 veľké písmená bez zameniteľných znakov.

**REST** (súťaž a rebríček, dáta v `server/data/entries.json`, v `.gitignore`):
- `POST /api/entries {name,email,mode,won,score,accuracy}` → `{id}`
- `GET /api/leaderboard?mode=cpu|vs` → top 10 `[{name,score,accuracy,won,ts}]`, bez e-mailov

**Hra (HRA):** logické rozlíšenie 1600×900, canvas sa škáluje na obrazovku. Mierenie ťahaním (prak, pointer events pre myš aj dotyk) so živým zobrazením uhla a sily, krátky náhľad trajektórie. Vietor sa ukazuje šípkou a číslom, sneží (častice), na začiatku sú 1–3 snehuliaci v strede. Zásah = efekt a +1 bod, prvý na 5 vyhráva. Na pódiu všetko veľké a čitateľné. Vzhľad 2D s hĺbkou: nočná obloha s gradientom, parallax vrstvy (hory, jedličky, svetielka), tiene pod postavami, žiara a častice pri zásahu, jemné kývanie kamery pri dopade.

**Výsledky (VÝSLEDKY):** karta 1080×1350 kreslená na canvas (režim „vs Počítač“ / „VS Online“, skóre, presnosť, hashtag, URL). Tlačidlá: Zdieľať (`navigator.share` so súborom, inak stiahnutie PNG), Stiahnuť, Kopírovať text s hashtagom, formulár „Zapoj sa do súťaže“ (meno + e-mail → `POST /api/entries`), rebríček zvlášť pre CPU a VS, Hrať znova.

## Hlavné pravidlo: všetko podriaď tomu, aby sme to stihli

- Hotový a funkčný výsledok je dôležitejší než dokonalý kód. Rob najjednoduchšie riešenie, ktoré funguje.
- **Nepíš žiadne testy** (unit, e2e, TDD). Nespúšťaj testovacie frameworky ani ich nenastavuj.
- Nepoužívaj procesné skilly, ktoré spomaľujú (brainstorming, writing-plans, TDD, code review). Tento súbor má pred nimi prednosť.
- **Paralelní agenti áno** (hodnotí sa „ako efektívne využívaš AI agentov“): nezávislé moduly robia agenti súčasne. Každý agent mení **len svoje súbory** podľa tabuľky nižšie. Agenti nerobia commit, push, deploy ani `vite build` a nespúšťajú servery. Overenie len `node --check`. Integráciu, build a deploy robí hlavný agent.
- Nekladieš zbytočné otázky. Ak je voľba zrejmá, rozhodni sám a stručne to povedz. Pýtaj sa len vtedy, keď by zlá voľba stála veľa času.
- Žiadne veľké refaktory ani „pre istotu“ kód. Neinštaluj závislosti, ktoré nie sú nutné.
- Komunikuj po slovensky a stručne.

## DRY – maximálne

- Nič neduplikuj. Logiku, markup aj štýly, ktoré sa opakujú, vytiahni do jednej zdieľanej funkcie, komponentu alebo modulu a používaj ich všade.
- Jeden zdroj pravdy: konštanty, konfigurácia, texty, farby a dáta patria na jedno miesto (napr. `config`/`constants`), nie natvrdo rozhádzané po kóde.
- UI skladaj zo znovupoužiteľných komponentov a dáta vykresľuj cez pole a `map`, nie kopírovaním rovnakých blokov.
- Štýly cez spoločné triedy, CSS premenné alebo design tokeny, nie opakovaním rovnakých hodnôt.
- Ak píšeš niečo druhýkrát, hneď to zjednoť. Zjednocuj však len to, čo sa naozaj opakuje, a nevymýšľaj abstrakcie dopredu pre prípady, ktoré nemáme.

## Postup

1. Po zadaní hneď navrhni stack a rozsah, ktorý sa dá stihnúť (MVP), a začni.
2. Čo najskôr postav funkčný základ, pushni ho a over, že beží na verejnej URL.
3. Potom pridávaj funkcie po malých krokoch. Po každom funkčnom kroku urob commit a push na `main`, bez pýtania.
4. Overenie len rýchle: build prejde a appka sa spustí. Nič viac.
5. 5 minút pred koncom prestaň s novými funkciami. Dolaď, doplň krátke README (čo to je a ako to spustiť) a urob finálny push.

## Deploy

- **Verejná URL: https://codecon.digitalnyinovator.sk** (Hostinger VPS, Ubuntu 26.04, HTTPS cez Let's Encrypt, IPv4 aj IPv6)
- **Deploy cez git: commit a potom `./deploy.sh`.** Skript pushne na `main` a server si cez SSH stiahne `origin/main` do `/opt/codecon` a nasadí ho. Trvá pár sekúnd. Nasadí sa len to, čo je commitnuté.
  - Frontend: ak je v koreni `package.json`, spustí `npm install` a `npm run build` a výstup z `dist/` nahrá do `/var/www/app`. Čisté HTML bez buildu patrí do `public/`.
  - SPA routing funguje, nginx vracia `index.html` pre neznáme cesty. Vite teda nechaj s predvoleným `base: '/'`.
  - Backend (len ak treba): Node appka v `server/` so vstupom `server/index.js`, **port 3000**, všetky routy pod **`/api/`** (aj websockety, napr. `/api/ws`). Beží cez pm2 ako proces `api`.
  - Tajné kľúče daj na server do `/opt/codecon/server/.env`. Súbor je v `.gitignore` a Node ho načíta cez `--env-file`.
- SSH: `ssh -i ~/.ssh/hostinger root@2.24.158.128`. Logy backendu: `pm2 logs api`.
- Na wildcard `*.codecon.digitalnyinovator.sk` zatiaľ nie je certifikát. Používaj hlavnú doménu.
- **Firebase nepoužívaj.**
- **Záloha pre statickú appku:** GitHub Pages cez GitHub Actions (https://ivankopcik.github.io/codeconzilina2026/), len ak Hostinger zlyhá.
- API kľúče (napr. pre AI) patria len na server, nikdy do frontendu ani do repa.
- QR kód vygeneruj pre finálnu URL.

## Technické preferencie

- Preferuj jednoduchý stack bez konfigurácie (napr. čisté HTML/JS, Vite, Next.js), podľa toho, čo zadanie vyžaduje.
- K dispozícii: Node 25, npm, pnpm, bun, Python 3.14, `gh` (prihlásený ako ivankopcik).
