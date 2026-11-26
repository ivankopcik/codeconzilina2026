# ❄️ Vianočná guľovačka

Prehliadačová hra z AI Battle na CODECON Žilina 2026. Dvaja hráči sa striedajú v hádzaní snehových gúľ, nastavujú uhol a silu, fúka vietor a v ceste stoja snehuliaci. Kto prvý trafí súpera 5×, vyhráva.

**Hraj:** https://codecon.digitalnyinovator.sk

- hra proti počítaču aj online VS (pozvánka cez QR kód)
- výsledky na zdieľanie (karta pre Instagram s `#CodeconGulovacka`) a súťaž cez e-mail
- rebríček zvlášť pre hru proti počítaču a pre VS

## Spustenie lokálne

```bash
npm install && (cd server && npm install)
node server/index.js &   # backend na :3000 (WebSocket + API)
npm run dev              # frontend, /api sa proxuje na :3000
```

## Deploy

Commit a `./deploy.sh`: push na `main`, server si stiahne zmeny, zbuildí frontend a reštartne backend.

Stack: Vite, vanilla JS, Canvas 2D, Node + `ws`, nginx, pm2.
