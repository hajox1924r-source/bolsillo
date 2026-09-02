// Lee un extracto PDF de Nequi (protegido con el número de documento) y saca los movimientos.
// La contraseña se usa acá mismo, nunca se guarda ni se envía a ningún lado.
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const num = (s) => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0
const toISO = (dmy) => { const [d, m, y] = dmy.split('/'); return `${y}-${m}-${d}` }

// Reconstruye líneas visuales del PDF agrupando por coordenada Y (más fiable que el texto plano).
async function pdfLines(file, password) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf, password }).promise
  const lines = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent()
    const byY = {}
    for (const it of content.items) {
      const y = Math.round(it.transform[5])
      ;(byY[y] ||= []).push(it)
    }
    Object.keys(byY).sort((a, b) => b - a).forEach((y) => {
      lines.push(byY[y].sort((p, q) => p.transform[4] - q.transform[4]).map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim())
    })
  }
  return lines
}

// ponytail: parser específico de Nequi (Fecha · Descripción · Valor · Saldo). Otro banco = otra función.
function parseNequi(lines) {
  const rowRe = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\$-?[\d.,]+)\s+(\$[\d.,]+)$/
  const items = []
  for (const ln of lines) {
    const m = ln.match(rowRe)
    if (!m) continue
    const neg = m[3].includes('-')
    const mag = num(m[3])
    items.push({ date: toISO(m[1]), desc: m[2].trim(), amount: neg ? -mag : mag })
  }
  let saldo = null
  const sl = lines.find((l) => /saldo actual/i.test(l))
  if (sl) { const mm = sl.match(/saldo actual\s+\$([\d.,]+)/i); if (mm) saldo = num(mm[1]) }
  return { items, saldo }
}

export async function readStatement(file, password) {
  const lines = await pdfLines(file, password)
  return parseNequi(lines)
}
