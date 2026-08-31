// Conexión con Gmail usando Google Identity Services (popup, sin redirección).
const GKEY = 'bolsillo.gtoken'
const CLIENT_ID = '647546328865-pni44bk1r0mqeqsv24f5bhfpce1b66bp.apps.googleusercontent.com'
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

export function gmailToken() {
  try { const j = JSON.parse(localStorage.getItem(GKEY) || 'null'); if (j && j.exp > Date.now()) return j.t } catch { /* nada */ }
  return null
}
export function saveGmailToken(token) {
  try { localStorage.setItem(GKEY, JSON.stringify({ t: token, exp: Date.now() + 55 * 60000 })) } catch { /* nada */ }
}

let tokenClient = null
function client() {
  if (tokenClient) return tokenClient
  const g = window.google
  if (!g || !g.accounts || !g.accounts.oauth2) return null
  tokenClient = g.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPE, callback: () => {} })
  return tokenClient
}

// Abre el popup de Google para conceder permiso de lectura de Gmail.
export function connectGmail() {
  return new Promise((resolve, reject) => {
    const c = client()
    if (!c) { reject(new Error('Google todavía no cargó; esperá un segundo y probá de nuevo.')); return }
    c.callback = (resp) => {
      if (resp && resp.access_token) { saveGmailToken(resp.access_token); resolve(resp.access_token) }
      else reject(new Error((resp && resp.error) || 'No se concedió el permiso.'))
    }
    c.requestAccessToken({ prompt: 'consent' })
  })
}

async function gapi(path, token) {
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + path, { headers: { Authorization: 'Bearer ' + token } })
  if (!r.ok) { const e = new Error('gmail ' + r.status); e.status = r.status; throw e }
  return r.json()
}

function b64(data) {
  try { return decodeURIComponent(escape(atob(data.replace(/-/g, '+').replace(/_/g, '/')))) } catch { return '' }
}
function bodyText(payload) {
  if (!payload) return ''
  if (payload.body && payload.body.data) {
    const t = b64(payload.body.data)
    return payload.mimeType === 'text/html' ? t.replace(/<[^>]+>/g, ' ') : t
  }
  if (payload.parts) return payload.parts.map(bodyText).join(' ')
  return ''
}
function parseAmount(text) {
  const re = /\$?\s?([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?)/g
  let m, best = 0
  while ((m = re.exec(text))) {
    const raw = m[1]
    const dec = Math.max(raw.lastIndexOf(','), raw.lastIndexOf('.'))
    let val
    if (dec > -1 && raw.length - dec - 1 === 2) val = Number(raw.slice(0, dec).replace(/[.,]/g, '') + '.' + raw.slice(dec + 1))
    else val = Number(raw.replace(/[.,]/g, ''))
    if (val > best) best = val
  }
  return best
}
function guessMerchant(text, subject) {
  const m = text.match(/en\s+([A-Za-zÁÉÍÓÚÑ0-9&.\-* ]{3,28})/)
  if (m) return m[1].trim().replace(/\s{2,}/g, ' ')
  return (subject || 'Movimiento').slice(0, 40)
}
const INCOME_RE = /(recib|abono|consign|n[oó]mina|te enviaron|te transfirieron|entr[oó] a tu|ingreso|devoluci|reembolso|pago recibido)/i
const BANK_Q = '(from:bancolombia OR from:nequi OR from:davivienda OR from:bbva OR from:scotiabank OR from:lulobank OR subject:(compra OR transacción OR transferencia OR retiro OR consignación OR "pago"))'

export async function gmailProfile() {
  const token = gmailToken()
  if (!token) { const e = new Error('sin token'); e.status = 401; throw e }
  return gapi('profile', token)
}

export async function fetchGmailMovements(days = 45) {
  const token = gmailToken()
  if (!token) { const e = new Error('sin token'); e.status = 401; throw e }
  const q = encodeURIComponent('newer_than:' + days + 'd ' + BANK_Q)
  const list = await gapi('messages?maxResults=40&q=' + q, token)
  const msgs = list.messages || []
  const out = []
  for (const mm of msgs) {
    const msg = await gapi('messages/' + mm.id + '?format=full', token)
    const headers = Object.fromEntries((msg.payload.headers || []).map((h) => [h.name.toLowerCase(), h.value]))
    const subject = headers.subject || ''
    const text = subject + ' ' + (msg.snippet || '') + ' ' + bodyText(msg.payload)
    const amount = parseAmount(text)
    if (!amount) continue
    out.push({
      id: mm.id,
      date: new Date(Number(msg.internalDate)).toISOString().slice(0, 10),
      merchant: guessMerchant(text, subject),
      amount: INCOME_RE.test(text) ? amount : -amount,
    })
  }
  return { scanned: msgs.length, items: out }
}
