import { useEffect, useState } from 'react'
import { supabase, hasCloud } from './lib/supabase.js'
import Auth from './Auth.jsx'
import Icon from './icons.jsx'
import { Home, Budgets, Reports, Goals } from './screens.jsx'
import { categories } from './data.js'
import { getTransactions, addTransaction } from './lib/db.js'

const NAV = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'presupuestos', label: 'Presup.', icon: 'chart' },
  { id: 'reportes', label: 'Reportes', icon: 'clock' },
  { id: 'metas', label: 'Metas', icon: 'target' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!hasCloud) // sin nube no hay login
  const [screen, setScreen] = useState('inicio')
  const [tx, setTx] = useState([])
  const [adding, setAdding] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark')

  // Sesión de Supabase
  useEffect(() => {
    if (!hasCloud) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Cargar movimientos (al entrar, o siempre en modo local)
  useEffect(() => {
    if (hasCloud && !session) { setTx([]); return }
    getTransactions().then(setTx).catch((e) => console.error('Error al cargar:', e.message))
  }, [session])

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    setDark(!dark)
  }
  const addTx = async (t) => {
    setAdding(false)
    try { setTx([await addTransaction(t), ...tx]) }
    catch (e) { console.error('Error al guardar:', e.message) }
  }

  const nombre = (session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '').split(' ')[0]
    || session?.user?.email?.split('@')[0] || ''

  if (hasCloud && !ready) return <div className="app splash">Cargando…</div>
  if (hasCloud && !session) return <div className="app"><Auth /></div>

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <div className="hello">Hola{nombre && ', ' + nombre} 👋</div>
          <h1>{screen === 'inicio' ? 'Buenas tardes' : ''}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="iconbtn" onClick={toggleTheme} aria-label="Cambiar tema">
            <Icon name={dark ? 'sun' : 'moon'} size={18} />
          </button>
          {hasCloud && (
            <button className="iconbtn" onClick={() => supabase.auth.signOut()} aria-label="Cerrar sesión">
              <Icon name="logout" size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="view" key={screen}>
        {screen === 'inicio' && <Home tx={tx} />}
        {screen === 'presupuestos' && <Budgets />}
        {screen === 'reportes' && <Reports />}
        {screen === 'metas' && <Goals />}
      </div>

      <nav className="navbar">
        {NAV.slice(0, 2).map((n) => <NavBtn key={n.id} n={n} on={screen === n.id} go={setScreen} />)}
        <button className="navb slot" aria-hidden="true" />
        {NAV.slice(2).map((n) => <NavBtn key={n.id} n={n} on={screen === n.id} go={setScreen} />)}
      </nav>
      <button className="fab" onClick={() => setAdding(true)} aria-label="Registrar movimiento">
        <Icon name="plus" size={26} />
      </button>

      {adding && <AddSheet onClose={() => setAdding(false)} onSave={addTx} />}
    </div>
  )
}

function NavBtn({ n, on, go }) {
  return (
    <button className={'navb' + (on ? ' on' : '')} onClick={() => go(n.id)}>
      <Icon name={n.icon} size={22} /><span>{n.label}</span>
    </button>
  )
}

function AddSheet({ onClose, onSave }) {
  const [type, setType] = useState('gasto')
  const [raw, setRaw] = useState('')
  const [cat, setCat] = useState('mercado')
  const opts = categories.filter((c) => (type === 'ingreso' ? c.id === 'ingreso' : c.id !== 'ingreso'))
  const amount = Number(raw || 0)

  const press = (k) => {
    if (k === 'del') setRaw((r) => r.slice(0, -1))
    else if (k === '000') setRaw((r) => (r ? r + '000' : ''))
    else setRaw((r) => (r.length < 9 ? (r + k).replace(/^0+/, '') : r))
  }
  const save = () => {
    if (!amount) return
    const c = opts.find((o) => o.id === cat) || opts[0]
    onSave({ cat: c.id, name: c.label, amount: type === 'gasto' ? -amount : amount })
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Registrar movimiento">
        <div className="grab" />
        <div className="seg">
          <button className={type === 'gasto' ? 'on' : ''} onClick={() => setType('gasto')}>Gasto</button>
          <button className={type === 'ingreso' ? 'on inc' : ''} onClick={() => { setType('ingreso'); setCat('ingreso') }}>Ingreso</button>
        </div>
        <div className={'amount-in ' + (type === 'gasto' ? 'exp' : 'inc')}>
          <span className="cur">$</span>
          <span className="num tnum">{amount ? amount.toLocaleString('es-CO') : '0'}</span>
        </div>
        <div className="cat-lbl">Categoría</div>
        <div className="cats">
          {opts.map((c) => (
            <button className={'cat' + (cat === c.id ? ' sel' : '')} key={c.id} onClick={() => setCat(c.id)}>
              <div className={'cc ' + c.tint}><Icon name={c.icon} size={21} /></div>
              <span className="cl">{c.label}</span>
            </button>
          ))}
        </div>
        <div className="kbd">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'].map((k) => (
            <button className="key" key={k} onClick={() => press(k)}>{k === 'del' ? '⌫' : k}</button>
          ))}
        </div>
        <button className="savebtn" disabled={!amount} onClick={save}>Guardar movimiento</button>
      </div>
    </div>
  )
}
