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
  if (has('nequi')) return 'linear-gradient(135deg,#5B0A86,#DA0081)'
  if (has('daviplata')) return 'linear-gradient(135deg,#C41230,#7A0C1E)'
  if (has('nubank') || /\bnu\b/.test(n)) return 'linear-gradient(135deg,#820AD1,#4A0A78)'
  if (has('bancolombia')) return 'linear-gradient(135deg,#3A3A38,#12100C)'
  if (has('davivienda')) return 'linear-gradient(135deg,#ED1C24,#8E1116)'
  if (has('bbva')) return 'linear-gradient(135deg,#0A4FA3,#04294F)'
  if (has('bogot')) return 'linear-gradient(135deg,#0A2E6E,#04173A)'
  if (has('scotia') || has('colpatria')) return 'linear-gradient(135deg,#D3272C,#7A1518)'
  if (has('lulo')) return 'linear-gradient(135deg,#00C2A8,#00776A)'
  return null
}
