// Datos de referencia y helpers de Bolsillo.
export const money = (n) => '$' + Math.round(Math.abs(n)).toLocaleString('es-CO')

export const categories = [
  { id: 'mercado', label: 'Mercado', tint: 't-red', icon: 'cart' },
  { id: 'comida', label: 'Comida', tint: 't-amber', icon: 'food' },
  { id: 'transporte', label: 'Transporte', tint: 't-green', icon: 'bus' },
  { id: 'hogar', label: 'Hogar', tint: 't-green', icon: 'home' },
  { id: 'ocio', label: 'Ocio', tint: 't-amber', icon: 'play' },
  { id: 'ingreso', label: 'Ingreso', tint: 't-green', icon: 'income' },
]
export const catById = (id) => categories.find((c) => c.id === id) || categories[0]

// ponytail: presupuestos y metas siguen como demo estática; se conectan a Supabase
// igual que los movimientos cuando haga falta.
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
