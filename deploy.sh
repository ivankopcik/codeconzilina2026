#!/usr/bin/env bash
# Deploy na https://codecon.digitalnyinovator.sk cez git.
#   ./deploy.sh          lokálne: git push, server si stiahne main a nasadí
#   ./deploy.sh server   beží na serveri (volá sa automaticky)
# Frontend: build z package.json -> dist/ (čisté HTML -> public/) -> /var/www/app
# Backend:  server/index.js, port 3000, routy pod /api/, pm2 proces "api", kľúče v server/.env
set -euo pipefail
cd "$(dirname "$0")"

SERVER=root@2.24.158.128
REPO_DIR=/opt/codecon
WEB_DIR=/var/www/app
URL=https://codecon.digitalnyinovator.sk

if [ "${1:-}" != server ]; then
  git push -q origin HEAD:main
  ssh -i "$HOME/.ssh/hostinger" -o IdentitiesOnly=yes "$SERVER" \
    "cd $REPO_DIR && git fetch -q origin && git reset -q --hard origin/main && bash deploy.sh server"
  echo "Deploy hotový: $URL"
  exit
fi

npm_i() { npm install --no-audit --no-fund --loglevel=error "$@"; }

if [ -f package.json ]; then
  npm_i
  if grep -q '"build"' package.json; then npm run build; fi
fi
rsync -a --delete "$([ -d dist ] && echo dist || echo public)/" "$WEB_DIR/"

if [ -f server/package.json ] || [ -f server/index.js ]; then
  touch server/.env
  if [ -f server/package.json ]; then (cd server && npm_i --omit=dev); fi
  pm2 restart api --update-env >/dev/null 2>&1 \
    || pm2 start "$REPO_DIR/server/index.js" --name api --cwd "$REPO_DIR/server" --node-args="--env-file=.env" >/dev/null
  pm2 save --force >/dev/null
fi
