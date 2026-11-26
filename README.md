# ❄️ Vianočná guľovačka

Prehliadačová hra z AI Battle na CODECON Žilina 2026. Dvaja hráči sa striedajú v hádzaní snehových gúľ, nastavujú uhol a silu, fúka vietor a v ceste stoja snehuliaci. Kto prvý trafí súpera 5×, vyhráva.

**Hraj:** https://codecon.digitalnyinovator.sk

- hra proti počítaču aj online VS (pozvánka cez QR kód)
- výber postavičky, vietor, fujavica, snehuliaci ako prekážky
- komentátor Mrázik s hlasom (ElevenLabs), kombá, K.O. slow-mo
- fanúšikovia cez QR posielajú emoji reakcie počas VS, LIVE počet ľudí online
- výsledky na zdieľanie na Instagram a Facebook s `#CodeconGulovacka` a súťaž cez e-mail
- rebríček zvlášť pre hru proti počítaču a pre VS

Postavené za 30 minút v AI Battle tímom Claude sessions: manager (architektúra, server, integrácia, deploy) s paralelnými agentmi HRA, ONLINE a VÝSLEDKY, grafik (scéna, postavičky, AI obrázky a videá), fun-factor (komentátor, emoji fanúšikov, kombá) a QA session.

## Spustenie lokálne

```bash
npm install && (cd server && npm install)
node server/index.js &   # backend na :3000 (WebSocket + API)
npm run dev              # frontend, /api sa proxuje na :3000
```

## Deploy

Commit a `./deploy.sh`: push na `main`, server si stiahne zmeny, zbuildí frontend a reštartne backend.

Stack: Vite, vanilla JS, Canvas 2D, Node + `ws`, nginx, pm2.
