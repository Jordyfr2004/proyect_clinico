#!/usr/bin/env node
// Oyente de eventos de citas por WebSocket (Laravel Reverb), para la demostración.
// Inicia sesión como la doctora, se suscribe al canal privado "clinica.doctora" e
// imprime cada evento en cuanto llega. Es el mismo canal que usa el panel web.
//
// Uso (desde frontend-web/):
//   node scripts/escuchar-eventos.mjs [URL_API] [HOST_WS] [PUERTO_WS] [CLAVE_REVERB]
//   Usuario y contraseña: variables DOCTORA_USUARIO y DOCTORA_PASSWORD (o se preguntan).
import Pusher from 'pusher-js'
import { createInterface } from 'node:readline/promises'

const [api = 'http://100.102.99.114/api', host = new URL(api).hostname, port = '80', key = 'clinica-clave'] = process.argv.slice(2)

async function preguntar(texto) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try { return await rl.question(texto) } finally { rl.close() }
}

const username = process.env.DOCTORA_USUARIO || await preguntar('Usuario de la doctora: ')
const password = process.env.DOCTORA_PASSWORD || await preguntar('Contraseña: ')

const login = await fetch(`${api}/auth/login`, {
  method: 'POST',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
})
const sesion = await login.json()
if (!login.ok) {
  console.error(`No se pudo iniciar sesión (${login.status}): ${sesion.message ?? ''}`)
  process.exit(1)
}

const hora = () => new Date().toLocaleTimeString('es-EC', { hour12: false })
const pusher = new Pusher(key, {
  wsHost: host, wsPort: Number(port), wssPort: Number(port), forceTLS: false,
  enabledTransports: ['ws'], cluster: '',
  channelAuthorization: {
    // Si el backend no responde, se informa y pusher-js reintenta al reconectar.
    customHandler: async ({ socketId, channelName }, callback) => {
      try {
        const r = await fetch(`${api}/broadcasting/auth`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${sesion.access_token}` },
          body: JSON.stringify({ socket_id: socketId, channel_name: channelName }),
        })
        r.ok ? callback(null, await r.json()) : callback(new Error(`autorización rechazada (${r.status})`), null)
      } catch (error) {
        callback(new Error(`backend no disponible: ${error.cause?.code ?? error.message}`), null)
      }
    },
  },
})

pusher.connection.bind('state_change', ({ current }) => console.log(`[${hora()}] conexión WebSocket: ${current}`))
const canal = pusher.subscribe('private-clinica.doctora')
canal.bind('pusher:subscription_succeeded', () => console.log(`[${hora()}] suscrito a private-clinica.doctora — esperando eventos (Ctrl+C para salir)\n`))
canal.bind('pusher:subscription_error', (e) => console.error(`[${hora()}] suscripción rechazada:`, e?.error ?? e))
canal.bind('cita_actualizada', (e) => {
  const cuando = e.fecha ? ` para ${e.fecha} ${e.hora_inicio ?? ''}` : ''
  console.log(`[${hora()}] EVENTO cita.${e.tipo.padEnd(26)} paciente=${e.paciente_nombre}  estado=${e.estado}${cuando}  instancia=${e.instancia}`)
})
