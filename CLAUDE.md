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

## Hlavné pravidlo: všetko podriaď tomu, aby sme to stihli

- Hotový a funkčný výsledok je dôležitejší než dokonalý kód. Rob najjednoduchšie riešenie, ktoré funguje.
- **Nepíš žiadne testy** (unit, e2e, TDD). Nespúšťaj testovacie frameworky ani ich nenastavuj.
- Nepoužívaj procesné skilly, ktoré spomaľujú (brainstorming, writing-plans, TDD, code review, subagent pipeline). Tento súbor má pred nimi prednosť.
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
