// Datos y helpers de Bolsillo.
// ponytail: persistimos en localStorage; cambiar a IndexedDB si crece el volumen.

export const money = (n) =>
  '$' + Math.round(Math.abs(n)).toLocaleString('es-CO')

export const categories = [
  { id: 'mercado', label: 'Mercado', tint: 't-red', icon: 'cart' },
  { id: 'comida', label: 'Comida', tint: 't-amber', icon: 'food' },
  { id: 'transporte', label: 'Transporte', tint: 't-green', icon: 'bus' },
  { id: 'hogar', label: 'Hogar', tint: 't-green', icon: 'home' },
  { id: 'ocio', label: 'Ocio', tint: 't-amber', icon: 'play' },
  { id: 'ingreso', label: 'Ingreso', tint: 't-green', icon: 'income' },
]
export const catById = (id) => categories.find((c) => c.id === id) || categories[0]

export const accounts = [
  { id: 'banco', name: 'Bancolombia', balance: 5180000 },
  { id: 'nequi', name: 'Nequi', balance: 1240500 },
  { id: 'efectivo', name: 'Efectivo', balance: 2000000 },
]

export const budgets = [
  { cat: 'mercado', label: 'Mercado', spent: 746000, limit: 900000, tint: 't-red' },
  { cat: 'transporte', label: 'Transporte', spent: 162000, limit: 300000, tint: 't-green' },
  { cat: 'comida', label: 'Restaurantes', spent: 520000, limit: 500000, tint: 't-amber' },
  { cat: 'hogar', label: 'Servicios', spent: 236700, limit: 500000, tint: 't-green' },
]

export const goals = [
  { emoji: '✈️', name: 'Viaje a Cartagena', sub: 'Diciembre 2026', now: 1800000, total: 3000000 },
  { emoji: '🛡️', name: 'Fondo de emergencia', sub: 'Meta: 3 meses de gastos', now: 5400000, total: 9000000 },
  { emoji: '💻', name: 'MacBook nuevo', sub: 'Sin fecha límite', now: 920000, total: 6500000 },
]

const SEED = [
  { id: 1, cat: 'mercado', name: 'Mercado — Éxito', account: 'Bancolombia', amount: -182400, date: 'Hoy · 29 ago' },
  { id: 2, cat: 'transporte', name: 'Uber al centro', account: 'Nequi', amount: -14900, date: 'Hoy · 29 ago' },
  { id: 3, cat: 'ingreso', name: 'Pago freelance', account: 'Bancolombia', amount: 1350000, date: 'Hoy · 29 ago' },
  { id: 4, cat: 'ocio', name: 'Netflix', account: 'Tarjeta Visa', amount: -44900, date: 'Ayer · 28 ago' },
  { id: 5, cat: 'hogar', name: 'Servicios — EPM', account: 'Bancolombia', amount: -236700, date: 'Ayer · 28 ago' },
]

const KEY = 'bolsillo.tx'
export function loadTx() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : SEED
  } catch {
    return SEED
  }
}
export function saveTx(tx) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tx))
  } catch { /* almacenamiento no disponible */ }
}
