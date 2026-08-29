// ponytail: un solo componente con los paths que usamos, en vez de una librería de íconos.
const P = {
  home: <path d="M3 11 12 3l9 8M5 10v10h14V10" />,
  chart: <><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="5" width="3" height="13" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l4 2" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  cart: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></>,
  food: <path d="M6 2v7a3 3 0 0 0 6 0V2M18 2c-1.5 0-2 4-2 7 0 2 .7 3 2 3v10" />,
  bus: <><path d="M5 17h14M6 17V9l2-4h8l2 4v8" /><circle cx="8" cy="17" r="1.6" /><circle cx="16" cy="17" r="1.6" /></>,
  play: <><path d="M4 4h16v14H4z" /><path d="m8 21 4-3 4 3" /></>,
  income: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
}
export default function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {P[name] || null}
    </svg>
  )
}
