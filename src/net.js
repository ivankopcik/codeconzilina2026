// Online spojenie cez WebSocket (/api/ws). Posiela sa len { angle, power }, zvyšok je deterministický zo seed.
const WS_URL = () => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`

export function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL())
    const listeners = { created: [], joined: [], watching: [], error: [], start: [], throw: [], react: [], left: [] }
    const on = (t, cb) => listeners[t].push(cb)
    const emit = (t, msg) => listeners[t]?.forEach((cb) => cb(msg))
    const send = (msg) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg))

    // Jednorazová odpoveď na požiadavku (created/joined), chyba alebo zatvorenie ju zamietne.
    const request = (msg, okType) =>
      new Promise((res, rej) => {
        const done = (fn) => (val) => {
          listeners[okType] = listeners[okType].filter((cb) => cb !== ok)
          listeners.error = listeners.error.filter((cb) => cb !== fail)
          listeners.left = listeners.left.filter((cb) => cb !== closed)
          fn(val)
        }
        const ok = done(({ t, ...data }) => res(data))
        const fail = done((m) => rej(new Error(m.message)))
        const closed = done(() => rej(new Error('Spojenie so serverom sa prerušilo')))
        on(okType, ok)
        on('error', fail)
        on('left', closed)
        send(msg)
      })

    let left = false
    const fireLeft = () => {
      if (left) return
      left = true
      emit('left')
    }

    ws.addEventListener('message', (e) => {
      let msg
      try {
        msg = JSON.parse(e.data)
      } catch {
        return
      }
      if (msg.t === 'left') fireLeft()
      else emit(msg.t, msg)
    })
    ws.addEventListener('close', fireLeft)
    ws.addEventListener('error', () => reject(new Error('Nepodarilo sa pripojiť k serveru')))
    // kód miestnosti si pamätáme v net.room (QR pre fanúšikov na hernej obrazovke)
    const remember = (data) => ((api.room = data.room), data)
    const api = {}
    ws.addEventListener('open', () =>
      resolve(Object.assign(api, {
        create: (name, avatar) => request({ t: 'create', name, avatar }, 'created').then(remember),
        join: (room, name, avatar) => request({ t: 'join', room, name, avatar }, 'joined').then(remember),
        watch: (room) => request({ t: 'watch', room }, 'watching').then(remember),
        sendReact: (emoji) => send({ t: 'react', emoji }),
        onReact: (cb) => on('react', ({ emoji }) => cb(emoji)),
        onStart: (cb) => on('start', ({ seed, names, avatars }) => cb({ seed, names, avatars })),
        sendThrow: ({ angle, power }) => send({ t: 'throw', angle, power }),
        onThrow: (cb) => on('throw', ({ angle, power }) => cb({ angle, power })),
        onLeft: (cb) => on('left', cb),
        close: () => ws.close(),
      })),
    )
  })
}
