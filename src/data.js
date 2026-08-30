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
