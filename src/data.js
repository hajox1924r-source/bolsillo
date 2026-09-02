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

// Tipos de cuenta (billetera, banco, tarjeta, efectivo). El saldo lo mantiene el usuario a mano.
export const acctKinds = [
  { id: 'billetera', label: 'Billetera', icon: 'wallet', tint: 't-amber' },
  { id: 'tarjeta', label: 'Tarjeta', icon: 'card', tint: 't-red' },
]
export const acctKind = (id) => acctKinds.find((k) => k.id === id) || acctKinds[0]

// Identifica la cuenta por su color de marca según el nombre. Sin logos: solo el color.
export const brandGrad = (name = '') => {
  const n = name.toLowerCase().trim()
  const has = (w) => n.includes(w)
  // Colores tomados de las tarjetas reales de cada entidad.
  if (has('nequi')) return 'linear-gradient(140deg,#3B0A63 0%,#8E1C9E 45%,#E5147E 100%)'
  if (has('nubank') || /\bnu\b/.test(n)) return 'linear-gradient(160deg,#8A17D4,#6E0BB0)' // Nu: morado icónico #820AD1
  if (has('daviplata')) return 'linear-gradient(140deg,#E4002B,#9E0020)'
  if (has('davivienda')) return 'linear-gradient(140deg,#ED1C24,#8E1116)'
  if (has('bancolombia')) return 'linear-gradient(140deg,#2C2A26,#0E0D0B)' // negra con acento amarillo
  if (has('bbva')) return 'linear-gradient(140deg,#0A4FA3,#062A52)'
  if (has('bogot')) return 'linear-gradient(140deg,#12386E,#08203F)'
  if (has('scotia') || has('colpatria')) return 'linear-gradient(140deg,#D3272C,#7A1518)'
  if (has('lulo')) return 'linear-gradient(140deg,#00C2A8,#00776A)'
  return null
}
