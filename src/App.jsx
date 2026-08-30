import { useEffect, useRef, useState } from 'react'
import { supabase, hasCloud } from './lib/supabase.js'
import Auth from './Auth.jsx'
import Icon from './icons.jsx'
import { Home, Budgets, Reports, Goals } from './screens.jsx'
import { categories, money } from './data.js'
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getBudgets, upsertBudget, deleteBudget,
  getGoals, createGoal, contributeGoal, deleteGoal,
  addManyTransactions,
} from './lib/db.js'
import { connectGmail, gmailToken, saveGmailToken, fetchGmailMovements } from './lib/gmail.js'

const NAV = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'presupuestos', label: 'Presup.', icon: 'chart' },
  { id: 'reportes', label: 'Reportes', icon: 'clock' },
  { id: 'metas', label: 'Metas', icon: 'target' },
]

function SyncSheet({ onClose, onImported }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('loading') // loading | needauth | list | empty | error
  const [items, setItems] = useState([])
  const [sel, setSel] = useState({})
  const [cat, setCat] = useState('mercado')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [scanned, setScanned] = useState(0)
  const opts = categories.filter((c) => c.id !== 'ingreso')

  useEffect(() => { const id = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setOpen(false); setTimeout(onClose, 280) }

  useEffect(() => {
    if (!gmailToken()) { setStatus('needauth'); return }
    let alive = true
    ;(async () => {
      try {
        const imported = new Set(JSON.parse(localStorage.getItem('bolsillo.gmailids') || '[]'))
        const res = await fetchGmailMovements()
        setScanned(res.scanned)
        const found = res.items.filter((m) => !imported.has(m.id))
        if (!alive) return
        if (!found.length) { setStatus('empty'); return }
        setItems(found)
        setSel(Object.fromEntries(found.map((f) => [f.id, true])))
        setStatus('list')
      } catch (e) {
        if (!alive) return
        if (e.status === 401 || e.status === 403) setStatus('needauth')
        else { setErr(e.message); setStatus('error') }
      }
    })()
    return () => { alive = false }
  }, [])

  const toggle = (id) => setSel((s) => ({ ...s, [id]: !s[id] }))
  const chosen = items.filter((i) => sel[i.id])

  const doImport = async () => {
    if (!chosen.length) return
    setBusy(true)
    const payload = chosen.map((i) => ({
      cat: i.amount > 0 ? 'ingreso' : cat, name: i.merchant, amount: i.amount, occurred_at: i.date + 'T12:00:00',
    }))
    try {
      const added = await addManyTransactions(payload)
      const ids = new Set(JSON.parse(localStorage.getItem('bolsillo.gmailids') || '[]'))
      chosen.forEach((i) => ids.add(i.id))
      localStorage.setItem('bolsillo.gmailids', JSON.stringify([...ids]))
      onImported(added)
      close()
    } catch (e) { setErr(e.message); setStatus('error'); setBusy(false) }
  }

  return (
    <div className={'scrim' + (open ? ' open' : '')} onClick={close}>
      <div className={'sheet' + (open ? ' open' : '')} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Sincronizar con Gmail">
        <div className="grab" />
        <button className="sheet-x" onClick={close} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        <div className="sheet-head"><span>Sincronizar con Gmail</span></div>

        {status === 'loading' && <p className="sync-msg">Leyendo tus correos del banco…</p>}

        {status === 'needauth' && (
          <div className="sync-center">
            <div className="empty-ic"><Icon name="mail" size={30} /></div>
            <p className="sync-msg">Conectá tu Gmail para leer los correos de tu banco y crear los movimientos automáticamente.</p>
            <button className="savebtn" onClick={connectGmail}>Conectar Gmail</button>
            <p className="demo-note">Solo lectura. Google mostrará una pantalla de “app no verificada”: Avanzado → Continuar.</p>
          </div>
        )}

        {status === 'empty' && (
          <div className="sync-center">
            <div className="empty-ic"><Icon name="mail" size={30} /></div>
            <p className="sync-msg">{scanned === 0
              ? 'No encontré correos de bancos en los últimos 45 días.'
              : `Revisé ${scanned} correos, pero no pude extraer el monto de ninguno (hay que afinar el lector para tu banco).`}</p>
            <button className="savebtn ghost" onClick={connectGmail}>Reconectar Gmail</button>
          </div>
        )}

        {status === 'error' && (
          <div className="sync-center">
            <p className="sync-msg" style={{ color: 'var(--expense)' }}>No pude leer los correos.<br />{err}</p>
            <button className="savebtn ghost" onClick={connectGmail}>Reconectar Gmail</button>
          </div>
        )}

        {status === 'list' && (
          <>
            <p className="sync-msg">Encontré {items.length} movimiento{items.length === 1 ? '' : 's'}. Revisá y elegí cuáles importar:</p>
            <div className="cat-lbl" style={{ marginTop: 0 }}>Categoría para los gastos</div>
            <div className="cats">
              {opts.map((c) => (
                <button className={'cat' + (cat === c.id ? ' sel' : '')} key={c.id} onClick={() => setCat(c.id)}>
                  <div className={'cc ' + c.tint}><Icon name={c.icon} size={21} /></div>
                  <span className="cl">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="sync-list">
              {items.map((i) => (
                <button key={i.id} type="button" className={'sync-row' + (sel[i.id] ? ' on' : '')} onClick={() => toggle(i.id)}>
                  <span className="chk">{sel[i.id] && <Icon name="check" size={13} />}</span>
                  <span className="mid">
                    <span className="nm">{i.merchant}</span>
                    <span className="mt">{i.date}</span>
                  </span>
                  <span className={'amt tnum ' + (i.amount > 0 ? 'in' : '')}>{i.amount > 0 ? '+' : '−'}{money(i.amount)}</span>
                </button>
              ))}
            </div>
            <button className="savebtn" disabled={!chosen.length || busy} onClick={doImport}>
              {busy ? 'Importando…' : `Importar ${chosen.length} movimiento${chosen.length === 1 ? '' : 's'}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!hasCloud)
  const [screen, setScreen] = useState('inicio')
  const [tx, setTx] = useState([])
  const [budgets, setBudgets] = useState([])
  const [sheet, setSheet] = useState(null)     // movimiento
  const [bsheet, setBsheet] = useState(null)    // presupuesto
  const [goals, setGoals] = useState([])
  const [gsheet, setGsheet] = useState(null)    // meta
  const [syncOpen, setSyncOpen] = useState(false)
  const [veil, setVeil] = useState(false)
  const [fading, setFading] = useState(false)
  const viewRef = useRef(null)
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark')

  useEffect(() => {
    if (!hasCloud) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s?.provider_token) saveGmailToken(s.provider_token)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (hasCloud && !session) { setTx([]); setBudgets([]); setGoals([]); return }
    getTransactions().then(setTx).catch((e) => console.error('Error al cargar:', e.message))
    getBudgets().then(setBudgets).catch((e) => console.error('Error presupuestos:', e.message))
    getGoals().then(setGoals).catch((e) => console.error('Error metas:', e.message))
  }, [session])

  const go = (id) => {
    if (id === screen) return
    setFading(true)
    setTimeout(() => {
      setScreen(id)
      if (viewRef.current) viewRef.current.scrollTop = 0
      setFading(false)
    }, 170)
  }

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try { localStorage.setItem('bolsillo.theme', next) } catch { /* almacenamiento no disponible */ }
    setDark(!dark)
  }

  const logout = () => {
    setVeil(true)
    setTimeout(async () => {
      await supabase.auth.signOut()
      setScreen('inicio')
      setTimeout(() => setVeil(false), 140)
    }, 300)
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

  const saveBudget = async (cat, limit) => {
    setBsheet(null)
    try {
      const b = await upsertBudget(cat, limit)
      setBudgets((list) => {
        const i = list.findIndex((x) => x.cat === b.cat)
        return i >= 0 ? list.map((x) => (x.cat === b.cat ? b : x)) : [...list, b]
      })
    } catch (e) { console.error('Error presupuesto:', e.message) }
  }

  const delBudget = async (id) => {
    setBsheet(null)
    try {
      await deleteBudget(id)
      setBudgets((list) => list.filter((b) => b.id !== id))
    } catch (e) { console.error('Error al borrar presupuesto:', e.message) }
  }

  const saveGoal = async (d) => {
    setGsheet(null)
    try { const g = await createGoal(d); setGoals((l) => [...l, g]) }
    catch (e) { console.error('Error meta:', e.message) }
  }
  const contribute = async (goal, amount) => {
    setGsheet(null)
    try { const g = await contributeGoal(goal, amount); setGoals((l) => l.map((x) => (x.id === g.id ? g : x))) }
    catch (e) { console.error('Error aporte:', e.message) }
  }
  const delGoal = async (id) => {
    setGsheet(null)
    try { await deleteGoal(id); setGoals((l) => l.filter((g) => g.id !== id)) }
    catch (e) { console.error('Error al borrar meta:', e.message) }
  }

  const importMany = (added) => setTx((list) =>
    [...added, ...list].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)))

  const nombre = (session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '').split(' ')[0]
    || session?.user?.email?.split('@')[0] || ''

  let content
  if (hasCloud && !ready) content = <div className="app splash">Cargando…</div>
  else if (hasCloud && !session) content = <div className="app"><Auth /></div>
  else content = (
    <div className="app">
      <div className="topbar">
        <div>
          <div className="hello">Hola{nombre && ', ' + nombre}</div>
          <h1>{screen === 'inicio' ? 'Buenas tardes' : ''}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasCloud && (
            <button className="iconbtn" onClick={() => setSyncOpen(true)} aria-label="Sincronizar con Gmail">
              <Icon name="mail" size={18} />
            </button>
          )}
          <button className="iconbtn" onClick={toggleTheme} aria-label="Cambiar tema">
            <Icon name={dark ? 'sun' : 'moon'} size={18} />
          </button>
          {hasCloud && (
            <button className="iconbtn" onClick={logout} aria-label="Cerrar sesión">
              <Icon name="logout" size={18} />
            </button>
          )}
        </div>
      </div>

      <div className={'view' + (fading ? ' fading' : '')} ref={viewRef}>
        {screen === 'inicio' && <Home tx={tx} onEdit={setSheet} />}
        {screen === 'presupuestos' && <Budgets tx={tx} budgets={budgets} onEdit={setBsheet} />}
        {screen === 'reportes' && <Reports tx={tx} />}
        {screen === 'metas' && <Goals goals={goals} onEdit={setGsheet} />}
      </div>

      <nav className="navbar">
        {NAV.slice(0, 2).map((n) => <NavBtn key={n.id} n={n} on={screen === n.id} go={go} />)}
        <button className="navb slot" aria-hidden="true" />
        {NAV.slice(2).map((n) => <NavBtn key={n.id} n={n} on={screen === n.id} go={go} />)}
      </nav>
      <button className="fab" onClick={() => setSheet({})} aria-label="Registrar movimiento">
        <Icon name="plus" size={26} />
      </button>

      {sheet && <TxSheet initial={sheet} onClose={() => setSheet(null)} onSave={saveTx} onDelete={delTx} />}
      {bsheet && (
        <BudgetSheet initial={bsheet} existing={budgets.map((b) => b.cat)}
          onClose={() => setBsheet(null)} onSave={saveBudget} onDelete={delBudget} />
      )}
      {gsheet && (
        <GoalSheet initial={gsheet} onClose={() => setGsheet(null)}
          onCreate={saveGoal} onContribute={contribute} onDelete={delGoal} />
      )}
      {syncOpen && <SyncSheet onClose={() => setSyncOpen(false)} onImported={importMany} />}
    </div>
  )

  return (
    <>
      {content}
      <div className={'veil' + (veil ? ' show' : '')} aria-hidden="true">
        <div className="veil-inner"><Icon name="wallet" size={40} /><span>Hasta luego</span></div>
      </div>
    </>
  )
}

function NavBtn({ n, on, go }) {
  return (
    <button className={'navb' + (on ? ' on' : '')} onClick={() => go(n.id)}>
      <Icon name={n.icon} size={22} /><span>{n.label}</span>
    </button>
  )
}

// Teclado numérico compartido
function Keypad({ onKey }) {
  const tap = (e, k) => {
    const el = e.currentTarget
    el.classList.add('down')
    setTimeout(() => el.classList.remove('down'), 140)
    onKey(k)
  }
  return (
    <div className="kbd">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'].map((k) => (
        <button className="key" key={k} onClick={(e) => tap(e, k)}>{k === 'del' ? '⌫' : k}</button>
      ))}
    </div>
  )
}
const pressDigits = (setRaw) => (k) => {
  if (k === 'del') setRaw((r) => r.slice(0, -1))
  else if (k === '000') setRaw((r) => (r ? r + '000' : ''))
  else setRaw((r) => (r.length < 9 ? (r + k).replace(/^0+/, '') : r))
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

  useEffect(() => { const id = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setOpen(false); setTimeout(onClose, 280) }
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
        <Keypad onKey={pressDigits(setRaw)} />
        <button className="savebtn" disabled={!amount} onClick={save}>
          {editing ? 'Guardar cambios' : 'Guardar movimiento'}
        </button>
      </div>
    </div>
  )
}

function BudgetSheet({ initial, existing, onClose, onSave, onDelete }) {
  const editing = !!initial?.id
  const expenseCats = categories.filter((c) => c.id !== 'ingreso')
  const avail = editing
    ? expenseCats.filter((c) => c.id === initial.cat)
    : expenseCats.filter((c) => !existing.includes(c.id))
  const [cat, setCat] = useState(initial?.cat || avail[0]?.id || '')
  const [raw, setRaw] = useState(editing ? String(initial.limit) : '')
  const [open, setOpen] = useState(false)
  const amount = Number(raw || 0)
  const selIdx = Math.max(0, avail.findIndex((c) => c.id === cat))

  useEffect(() => { const id = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setOpen(false); setTimeout(onClose, 280) }
  const save = () => { if (amount && cat) onSave(cat, amount) }

  return (
    <div className={'scrim' + (open ? ' open' : '')} onClick={close}>
      <div className={'sheet' + (open ? ' open' : '')} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Presupuesto">
        <div className="grab" />
        <button className="sheet-x" onClick={close} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        <div className="sheet-head">
          <span>{editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}</span>
          {editing && (
            <button className="del-btn" onClick={() => onDelete(initial.id)} aria-label="Borrar">
              <Icon name="trash" size={16} /> Borrar
            </button>
          )}
        </div>
        <div className="cat-lbl" style={{ marginTop: 0 }}>Categoría</div>
        {avail.length === 0 ? (
          <p style={{ color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', padding: '8px 0 4px' }}>
            Ya tenés presupuesto en todas las categorías.
          </p>
        ) : (
          <div className="cats">
            <span className="cat-thumb" style={{ transform: `translateX(${selIdx * 71}px)` }} />
            {avail.map((c) => (
              <button className={'cat' + (cat === c.id ? ' sel' : '')} key={c.id} disabled={editing} onClick={() => setCat(c.id)}>
                <div className={'cc ' + c.tint}><Icon name={c.icon} size={21} /></div>
                <span className="cl">{c.label}</span>
              </button>
            ))}
          </div>
        )}
        <div className="cat-lbl">Límite mensual</div>
        <div className="amount-in">
          <span className="cur">$</span>
          <span className="num tnum">{amount ? amount.toLocaleString('es-CO') : '0'}</span>
        </div>
        <Keypad onKey={pressDigits(setRaw)} />
        <button className="savebtn" disabled={!amount || !cat} onClick={save}>
          {editing ? 'Guardar cambios' : 'Crear presupuesto'}
        </button>
      </div>
    </div>
  )
}

const DOW = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA']

function DateField({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const [view, setView] = useState(() => (value ? new Date(value + 'T00:00:00') : new Date()))

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [open])
  const closeCal = () => { setShown(false); setTimeout(() => setOpen(false), 200) }
  const sel = value ? new Date(value + 'T00:00:00') : null
  const y = view.getFullYear(), m = view.getMonth()
  const startDow = new Date(y, m, 1).getDay()
  const daysIn = new Date(y, m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysIn; d++) cells.push(d)

  const pick = (d) => {
    onChange(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    closeCal()
  }
  const label = sel ? sel.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'
  const isSel = (d) => sel && sel.getDate() === d && sel.getMonth() === m && sel.getFullYear() === y

  return (
    <div className="datefield">
      <button type="button" className="text-in datebtn" onClick={() => (open ? closeCal() : setOpen(true))}>
        <span className={sel ? '' : 'ph'}>{label}</span>
        <Icon name="calendar" size={16} />
      </button>
      {open && (
        <div className={'cal-overlay' + (shown ? ' show' : '')} onClick={closeCal}>
          <div className="cal" onClick={(e) => e.stopPropagation()}>
          <div className="cal-head">
            <button type="button" onClick={() => setView(new Date(y, m - 1, 1))} aria-label="Mes anterior"><Icon name="chevL" size={16} /></button>
            <span className="cal-title">{view.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</span>
            <button type="button" onClick={() => setView(new Date(y, m + 1, 1))} aria-label="Mes siguiente"><Icon name="chevR" size={16} /></button>
          </div>
          <div className="cal-dow">{DOW.map((x, i) => <span key={i}>{x}</span>)}</div>
          <div className="cal-grid">
            {cells.map((d, i) => (d === null
              ? <span key={i} />
              : <button type="button" key={i} className={'cal-day tnum' + (isSel(d) ? ' sel' : '')} onClick={() => pick(d)}>{d}</button>))}
          </div>
          <div className="cal-foot">
            <button type="button" onClick={() => { onChange(''); closeCal() }}>Quitar</button>
            <button type="button" onClick={() => { const t = new Date(); onChange(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`); closeCal() }}>Hoy</button>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}

const GOAL_ICONS = ['plane', 'home', 'car', 'laptop', 'phone', 'cap', 'coin', 'gift', 'shield', 'heart']

function GoalSheet({ initial, onClose, onCreate, onContribute, onDelete }) {
  const editing = !!initial?.id
  const [open, setOpen] = useState(false)
  const [icon, setIcon] = useState(initial?.emoji || 'plane')
  const [name, setName] = useState(initial?.name || '')
  const [due, setDue] = useState(initial?.due || '')
  const [raw, setRaw] = useState('')
  const amount = Number(raw || 0)

  useEffect(() => { const id = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setOpen(false); setTimeout(onClose, 280) }
  const submit = () => {
    if (editing) { if (amount) onContribute(initial, amount) }
    else if (name && amount) onCreate({ name, emoji: icon, target: amount, due: due || null })
  }
  const p = editing ? Math.min(100, Math.round((initial.saved / initial.target) * 100)) : 0

  return (
    <div className={'scrim' + (open ? ' open' : '')} onClick={close}>
      <div className={'sheet' + (open ? ' open' : '')} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Meta">
        <div className="grab" />
        <button className="sheet-x" onClick={close} aria-label="Cerrar"><Icon name="x" size={18} /></button>

        {editing ? (
          <>
            <div className="sheet-head">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name={initial.emoji} size={18} /> {initial.name}</span>
              <button className="del-btn" onClick={() => onDelete(initial.id)} aria-label="Borrar">
                <Icon name="trash" size={16} /> Borrar
              </button>
            </div>
            <div className="track" style={{ marginBottom: 8 }}><div className="fill" style={{ width: p + '%' }} /></div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'center', marginBottom: 6 }}>
              {money(initial.saved)} de {money(initial.target)} · {p}%
            </div>
            <div className="cat-lbl">Sumar al ahorro</div>
            <div className="amount-in inc"><span className="cur">$</span><span className="num tnum">{amount ? amount.toLocaleString('es-CO') : '0'}</span></div>
            <Keypad onKey={pressDigits(setRaw)} />
            <button className="savebtn" disabled={!amount} onClick={submit}>
              Sumar {amount ? money(amount) : ''} al ahorro
            </button>
          </>
        ) : (
          <>
            <div className="sheet-head"><span>Nueva meta</span></div>
            <div className="cat-lbl" style={{ marginTop: 0 }}>Ícono</div>
            <div className="emoji-row">
              {GOAL_ICONS.map((ic) => (
                <button key={ic} className={'emoji-pick' + (icon === ic ? ' sel' : '')} onClick={() => setIcon(ic)} aria-label={ic}>
                  <Icon name={ic} size={22} />
                </button>
              ))}
            </div>
            <div className="cat-lbl">Nombre</div>
            <input className="text-in" value={name} maxLength={40}
              onChange={(e) => setName(e.target.value)} placeholder="Ej: Viaje a Cartagena" />
            <div className="cat-lbl">Fecha límite (opcional)</div>
            <DateField value={due} onChange={setDue} />
            <div className="cat-lbl">Meta de ahorro</div>
            <div className="amount-in"><span className="cur">$</span><span className="num tnum">{amount ? amount.toLocaleString('es-CO') : '0'}</span></div>
            <Keypad onKey={pressDigits(setRaw)} />
            <button className="savebtn" disabled={!name || !amount} onClick={submit}>Crear meta</button>
          </>
        )}
      </div>
    </div>
  )
}
