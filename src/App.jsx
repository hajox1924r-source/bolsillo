import { useEffect, useState } from 'react'
import { supabase, hasCloud } from './lib/supabase.js'
import Auth from './Auth.jsx'
import Icon from './icons.jsx'
import { Home, Budgets, Reports, Goals } from './screens.jsx'
import { categories } from './data.js'
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from './lib/db.js'

const NAV = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'presupuestos', label: 'Presup.', icon: 'chart' },
  { id: 'reportes', label: 'Reportes', icon: 'clock' },
  { id: 'metas', label: 'Metas', icon: 'target' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!hasCloud)
  const [screen, setScreen] = useState('inicio')
  const [tx, setTx] = useState([])
  const [sheet, setSheet] = useState(null) // null | {} (nuevo) | tx (editar)
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark')

  useEffect(() => {
    if (!hasCloud) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (hasCloud && !session) { setTx([]); return }
    getTransactions().then(setTx).catch((e) => console.error('Error al cargar:', e.message))
  }, [session])

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    setDark(!dark)
  }

  const saveTx = async (data) => {
    setSheet(null)
    try {
      if (data.id) {
        const u = await updateTransaction(data.id, data)
        setTx((list) => list.map((t) => (t.id === u.id ? u : t)))
      } else {
        const n = await addTransaction(data)
        setTx((list) => [n, ...list])
      }
    } catch (e) { console.error('Error al guardar:', e.message) }
  }

  const delTx = async (id) => {
    setSheet(null)
    try {
      await deleteTransaction(id)
      setTx((list) => list.filter((t) => t.id !== id))
    } catch (e) { console.error('Error al borrar:', e.message) }
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
        {screen === 'inicio' && <Home tx={tx} onEdit={setSheet} />}
        {screen === 'presupuestos' && <Budgets />}
        {screen === 'reportes' && <Reports tx={tx} />}
        {screen === 'metas' && <Goals />}
      </div>

      <nav className="navbar">
        {NAV.slice(0, 2).map((n) => <NavBtn key={n.id} n={n} on={screen === n.id} go={setScreen} />)}
        <button className="navb slot" aria-hidden="true" />
        {NAV.slice(2).map((n) => <NavBtn key={n.id} n={n} on={screen === n.id} go={setScreen} />)}
      </nav>
      <button className="fab" onClick={() => setSheet({})} aria-label="Registrar movimiento">
        <Icon name="plus" size={26} />
      </button>

      {sheet && (
        <TxSheet initial={sheet} onClose={() => setSheet(null)} onSave={saveTx} onDelete={delTx} />
      )}
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

function TxSheet({ initial, onClose, onSave, onDelete }) {
  const editing = !!initial?.id
  const [type, setType] = useState(editing ? (initial.amount < 0 ? 'gasto' : 'ingreso') : 'gasto')
  const [raw, setRaw] = useState(editing ? String(Math.abs(initial.amount)) : '')
  const [cat, setCat] = useState(initial?.cat || 'mercado')
  const [open, setOpen] = useState(false)
  const opts = categories.filter((c) => (type === 'ingreso' ? c.id === 'ingreso' : c.id !== 'ingreso'))
  const amount = Number(raw || 0)
  const selIdx = Math.max(0, opts.findIndex((o) => o.id === cat))

  // Animación de entrada/salida por transición (funciona sin efectos del SO).
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const close = () => { setOpen(false); setTimeout(onClose, 280) }

  const press = (k) => {
    if (k === 'del') setRaw((r) => r.slice(0, -1))
    else if (k === '000') setRaw((r) => (r ? r + '000' : ''))
    else setRaw((r) => (r.length < 9 ? (r + k).replace(/^0+/, '') : r))
  }
  const save = () => {
    if (!amount) return
    const c = opts.find((o) => o.id === cat) || opts[0]
    onSave({ id: initial?.id, cat: c.id, name: c.label, amount: type === 'gasto' ? -amount : amount })
  }

  return (
    <div className={'scrim' + (open ? ' open' : '')} onClick={close}>
      <div className={'sheet' + (open ? ' open' : '')} onClick={(e) => e.stopPropagation()}
        role="dialog" aria-label={editing ? 'Editar movimiento' : 'Registrar movimiento'}>
        <div className="grab" />
        <button className="sheet-x" onClick={close} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        {editing && (
          <div className="sheet-head">
            <span>Editar movimiento</span>
            <button className="del-btn" onClick={() => onDelete(initial.id)} aria-label="Borrar">
              <Icon name="trash" size={16} /> Borrar
            </button>
          </div>
        )}
        <div className={'seg ' + type}>
          <span className="seg-thumb" />
          <button className={type === 'gasto' ? 'on' : ''} onClick={() => setType('gasto')}>Gasto</button>
          <button className={type === 'ingreso' ? 'on inc' : ''} onClick={() => { setType('ingreso'); setCat('ingreso') }}>Ingreso</button>
        </div>
        <div className={'amount-in ' + (type === 'gasto' ? 'exp' : 'inc')}>
          <span className="cur">$</span>
          <span className="num tnum">{amount ? amount.toLocaleString('es-CO') : '0'}</span>
        </div>
        <div className="cat-lbl">Categoría</div>
        <div className="cats">
          <span className="cat-thumb" style={{ transform: `translateX(${selIdx * 71}px)` }} />
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
        <button className="savebtn" disabled={!amount} onClick={save}>
          {editing ? 'Guardar cambios' : 'Guardar movimiento'}
        </button>
      </div>
    </div>
  )
}
