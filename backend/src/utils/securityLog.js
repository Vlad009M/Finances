const crypto = require('crypto')

// Grafana Cloud Loki push (значення беруться з env; якщо не задані — лог іде лише в stdout)
const LOKI_URL = process.env.LOKI_URL     // напр. https://logs-prod-XXX.grafana.net/loki/api/v1/push
const LOKI_USER = process.env.LOKI_USER   // числовий User/instance ID з Grafana Cloud
const LOKI_TOKEN = process.env.LOKI_TOKEN // Access Policy token зі scope logs:write
const ENV = process.env.NODE_ENV || 'development'
const SERVICE = 'aperio-api'

const lokiEnabled = !!(LOKI_URL && LOKI_USER && LOKI_TOKEN)
const authHeader = lokiEnabled
  ? 'Basic ' + Buffer.from(`${LOKI_USER}:${LOKI_TOKEN}`).toString('base64')
  : null

// Реальний IP клієнта (за Cloudflare). Фолбек на req.ip поза CF.
function getClientIp(req) {
  return req?.headers?.['cf-connecting-ip'] || req?.ip || 'unknown'
}

// Хеш email — щоб корелювати спроби без зберігання PII у логах
function hashEmail(email) {
  if (!email) return null
  return crypto.createHash('sha256').update(String(email).toLowerCase()).digest('hex').slice(0, 12)
}

// Унікальний монотонний timestamp у наносекундах (Loki вимагає string ns)
let nanoCounter = 0
function nowNs() {
  nanoCounter = (nanoCounter + 1) % 1000000
  return `${Date.now()}${String(nanoCounter).padStart(6, '0')}`
}

let buffer = []
let timer = null

function logSecurityEvent(event, data = {}) {
  const entry = { ts: new Date().toISOString(), event, service: SERVICE, env: ENV, ...data }

  // 1) Завжди в stdout — Render-логи як резервна копія, ніколи не падає
  console.log(JSON.stringify({ sec: true, ...entry }))

  // 2) Best-effort у Loki (батчимо)
  if (!lokiEnabled) return
  buffer.push({ event, line: JSON.stringify(entry), tsNs: nowNs() })
  if (buffer.length >= 50) flush()
  else if (!timer) timer = setTimeout(flush, 5000)
}

async function flush() {
  if (timer) { clearTimeout(timer); timer = null }
  if (buffer.length === 0) return
  const batch = buffer
  buffer = []

  // Групуємо за event (низькокардинальний label). IP/userId — у тілі рядка, не в labels.
  const byEvent = {}
  for (const e of batch) (byEvent[e.event] ??= []).push([e.tsNs, e.line])
  const streams = Object.entries(byEvent).map(([event, values]) => ({
    stream: { service: SERVICE, env: ENV, kind: 'security', event },
    values: values.sort((a, b) => (a[0] < b[0] ? -1 : 1)),
  }))

  try {
    const res = await fetch(LOKI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({ streams }),
    })
    if (!res.ok) console.error('[securityLog] Loki', res.status, (await res.text()).slice(0, 200))
  } catch (err) {
    console.error('[securityLog] Loki push failed:', err.message)
  }
}

// Флаш недосланих подій при завершенні процесу
process.on('SIGTERM', flush)
process.on('SIGINT', flush)

module.exports = { logSecurityEvent, getClientIp, hashEmail }
