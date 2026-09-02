import { useEffect, useRef, useState } from 'react'
import { supabase, hasCloud } from './lib/supabase.js'
import Auth from './Auth.jsx'
import Icon from './icons.jsx'
import { Home, Budgets, Reports, Goals, CardVisual } from './screens.jsx'
import { categories, money, acctKinds, acctKind, catById } from './data.js'
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getBudgets, upsertBudget, deleteBudget,
  getGoals, createGoal, contributeGoal, deleteGoal,
  addManyTransactions,
  getAccounts, createAccount, updateAccount, deleteAccount,
} from './lib/db.js'
import { connectGmail, gmailToken, fetchGmailMovements, gmailProfile, tokenScopes } from './lib/gmail.js'

const NAV = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'presupuestos', label: 'Presup.', icon: 'chart' },
  { id: 'reportes', label: 'Reportes', icon: 'clock' },
  { id: 'metas', label: 'Metas', icon: 'target' },
]

// --- Perfil y PIN (utilidades) ---
const PINKEY = 'bolsillo.pin'
const hashPin = (p) => { let h = 5381; for (const c of p) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return String(h) }
const getPin = () => { try { return localStorage.getItem(PINKEY) || '' } catch { return '' } }
const setPinStore = (p) => { try { localStorage.setItem(PINKEY, hashPin(p)) } catch { /* nd */ } }
const clearPinStore = () => { try { localStorage.removeItem(PINKEY) } catch { /* nd */ } }
const checkPin = (p) => getPin() === hashPin(p)

// Recorta la imagen a un cuadrado de 256px y la devuelve como data URL liviano (JPEG).
function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(img.width, img.height), S = 256
      const c = document.createElement('canvas'); c.width = S; c.height = S
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, S, S)
      URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject; img.src = url
  })
}

function SyncSheet({ onClose, onImported }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('loading') // loading | needauth | list | empty | error
  const [items, setItems] = useState([])
  const [sel, setSel] = useState({})
  const [cat, setCat] = useState('mercado')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [scanned, setScanned] = useState(0)
  const [connEmail, setConnEmail] = useState('')
  const opts = categories.filter((c) => c.id !== 'ingreso')

  useEffect(() => { const id = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setOpen(false); setTimeout(onClose, 280) }

  const load = async () => {
    setStatus('loading')
    try {
      const prof = await gmailProfile()
      setConnEmail(prof.emailAddress || '')
      const imported = new Set(JSON.parse(localStorage.getItem('bolsillo.gmailids') || '[]'))
      const res = await fetchGmailMovements()
      setScanned(res.scanned)
      const found = res.items.filter((m) => !imported.has(m.id))
      if (!found.length) { setStatus('empty'); return }
      setItems(found)
      setSel(Object.fromEntries(found.map((f) => [f.id, true])))
      setStatus('list')
    } catch (e) {
      if (e.status === 401 || e.status === 403) setStatus('needauth')
      else { setErr(e.message); setStatus('error') }
    }
  }

  const handleConnect = async () => {
    setErr('')
    setStatus('loading')
    try {
      await connectGmail()
      const sc = await tokenScopes()
      if (!/gmail/i.test(sc)) {
        setErr('El permiso de Gmail NO quedó en el token. Concedido: ' + sc)
        setStatus('needauth')
        return
      }
      await load()
    } catch (e) { setErr(e.message); setStatus('needauth') }
  }

  useEffect(() => {
    if (!gmailToken()) { setStatus('needauth'); return }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = (id) => setSel((x) => ({ ...x, [id]: !x[id] }))
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
        {connEmail && <div className="conn-ok"><Icon name="check" size={13} /> Conectado como {connEmail}</div>}

        {status === 'loading' && <p className="sync-msg">{connEmail ? 'Leyendo tus correos del banco…' : 'Conectando con Gmail…'}</p>}

        {status === 'needauth' && (
          <div className="sync-center">
            <div className="empty-ic"><Icon name="mail" size={30} /></div>
            <p className="sync-msg">Conectá tu Gmail para leer los correos de tu banco y crear los movimientos automáticamente.</p>
            {err && <p className="sync-msg" style={{ color: 'var(--expense)' }}>{err}</p>}
            <button className="savebtn" onClick={handleConnect}>Conectar Gmail</button>
            <p className="demo-note">Se abre un popup de Google. Si dice “app no verificada”: Avanzado → Continuar, y permití el acceso a Gmail.</p>
          </div>
        )}

        {status === 'empty' && (
          <div className="sync-center">
            <div className="empty-ic"><Icon name="mail" size={30} /></div>
            <p className="sync-msg">{scanned === 0
              ? 'No encontré correos de bancos en los últimos 45 días.'
              : `Revisé ${scanned} correos, pero no pude extraer el monto de ninguno (hay que afinar el lector para tu banco).`}</p>
            <button className="savebtn ghost" onClick={handleConnect}>Reconectar Gmail</button>
          </div>
        )}

        {status === 'error' && (
          <div className="sync-center">
            <p className="sync-msg" style={{ color: 'var(--expense)' }}>No pude leer los correos.<br />{err}</p>
            <button className="savebtn ghost" onClick={handleConnect}>Reconectar Gmail</button>
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
  const [accounts, setAccounts] = useState([])
  const [asheet, setAsheet] = useState(null)    // cuenta (crear/editar)
  const [adetail, setAdetail] = useState(null)  // cuenta (ver detalle)
  const [profileOpen, setProfileOpen] = useState(false)
  const [locked, setLocked] = useState(() => !!getPin())
  const [localProf, setLocalProf] = useState(() => { try { return JSON.parse(localStorage.getItem('bolsillo.profile') || '{}') } catch { return {} } })
  const [defAccount, setDefAccount] = useState(() => { try { return localStorage.getItem('bolsillo.defaultAccount') || '' } catch { return '' } })
  const [avatarUrl, setAvatarUrl] = useState(() => { try { return localStorage.getItem('bolsillo.avatar') || '' } catch { return '' } })
  const [syncOpen, setSyncOpen] = useState(false)
  const [stmtOpen, setStmtOpen] = useState(false)
  const curMonth = () => new Date().toISOString().slice(0, 7)
  const [stmtMonth, setStmtMonth] = useState(() => { try { return localStorage.getItem('bolsillo.stmtMonth') || '' } catch { return '' } })
  const markStmtMonth = () => { const m = curMonth(); try { localStorage.setItem('bolsillo.stmtMonth', m) } catch { /* nd */ }; setStmtMonth(m) }
  const [veil, setVeil] = useState(false)
  const [fading, setFading] = useState(false)
  const viewRef = useRef(null)
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark')

  useEffect(() => {
    if (!hasCloud) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (hasCloud && !session) { setTx([]); setBudgets([]); setGoals([]); setAccounts([]); return }
    getTransactions().then(setTx).catch((e) => console.error('Error al cargar:', e.message))
    getBudgets().then(setBudgets).catch((e) => console.error('Error presupuestos:', e.message))
    getGoals().then(setGoals).catch((e) => console.error('Error metas:', e.message))
    getAccounts().then(setAccounts).catch((e) => console.error('Error cuentas:', e.message))
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

  // Ajusta el saldo de una cuenta y lo persiste. delta con signo (gasto negativo, ingreso positivo).
  const applyBalance = async (accountId, delta) => {
    if (!accountId || !delta) return
    const acc = accounts.find((a) => a.id === accountId)
    if (!acc) return
    const nb = acc.balance + delta
    setAccounts((l) => l.map((a) => (a.id === accountId ? { ...a, balance: nb } : a)))
    try { await updateAccount(accountId, { name: acc.name, kind: acc.kind, balance: nb }) }
    catch (e) { console.error('Error saldo:', e.message) }
  }

  // Fija el saldo de una cuenta a un valor exacto (p. ej. el \"Saldo actual\" del extracto).
  const setAccountBalance = async (id, value) => {
    const acc = accounts.find((a) => a.id === id)
    if (!acc) return
    setAccounts((l) => l.map((a) => (a.id === id ? { ...a, balance: value } : a)))
    try { await updateAccount(id, { name: acc.name, kind: acc.kind, balance: value }) }
    catch (e) { console.error('Error saldo:', e.message) }
  }

  const saveTx = async (data) => {
    setSheet(null)
    try {
      if (data.id) {
        const old = tx.find((t) => t.id === data.id)
        const u = await updateTransaction(data.id, data)
        setTx((list) => list.map((t) => (t.id === u.id ? u : t)))
        if (old) {
          if (old.account === u.account) await applyBalance(u.account, u.amount - old.amount)
          else { await applyBalance(old.account, -old.amount); await applyBalance(u.account, u.amount) }
        }
      } else {
        const n = await addTransaction(data)
        setTx((list) => [n, ...list])
        await applyBalance(n.account, n.amount)
      }
    } catch (e) { console.error('Error al guardar:', e.message) }
  }

  const delTx = async (id) => {
    setSheet(null)
    const old = tx.find((t) => t.id === id)
    try {
      await deleteTransaction(id)
      setTx((list) => list.filter((t) => t.id !== id))
      if (old) await applyBalance(old.account, -old.amount)
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

  const saveAccount = async (d) => {
    setAsheet(null)
    try {
      if (d.id) {
        const a = await updateAccount(d.id, d)
        setAccounts((l) => l.map((x) => (x.id === a.id ? a : x)))
      } else {
        const a = await createAccount(d)
        setAccounts((l) => [...l, a])
      }
    } catch (e) { console.error('Error cuenta:', e.message) }
  }
  const delAccount = async (id) => {
    setAsheet(null)
    try { await deleteAccount(id); setAccounts((l) => l.filter((a) => a.id !== id)) }
    catch (e) { console.error('Error al borrar cuenta:', e.message) }
  }

  const updateProfile = async (patch) => {
    if ('avatar_url' in patch) {  // la foto vive en el teléfono, no en el token de la cuenta
      setAvatarUrl(patch.avatar_url); try { localStorage.setItem('bolsillo.avatar', patch.avatar_url) } catch { /* nd */ }
    }
    if ('full_name' in patch) {
      if (hasCloud) {
        const base = session?.user?.user_metadata || {}
        const { data, error } = await supabase.auth.updateUser({ data: { ...base, full_name: patch.full_name } })
        if (error) console.error('Error perfil:', error.message)
        else if (data?.user) setSession((sx) => (sx ? { ...sx, user: data.user } : sx))
      } else {
        const next = { ...localProf, full_name: patch.full_name }
        setLocalProf(next); try { localStorage.setItem('bolsillo.profile', JSON.stringify(next)) } catch { /* nd */ }
      }
    }
  }
  const chooseDefaultAccount = (id) => { setDefAccount(id); try { localStorage.setItem('bolsillo.defaultAccount', id) } catch { /* nd */ } }
  const disablePin = () => { clearPinStore(); setLocked(false) }

  const importMany = (added) => setTx((list) =>
    [...added, ...list].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)))

  const meta = hasCloud ? (session?.user?.user_metadata || {}) : localProf
  const avatar = avatarUrl
  const nombre = (meta.full_name || meta.name || '').split(' ')[0] || session?.user?.email?.split('@')[0] || ''

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
          <button className="iconbtn" onClick={() => setStmtOpen(true)} aria-label="Importar extracto">
            <Icon name="doc" size={18} />
          </button>
          <button className="avatarbtn" onClick={() => setProfileOpen(true)} aria-label="Perfil">
            {avatar ? <img src={avatar} alt="Perfil" /> : <Icon name="user" size={18} />}
          </button>
        </div>
      </div>

      <div className={'view' + (fading ? ' fading' : '')} ref={viewRef}>
        {screen === 'inicio' && <Home tx={tx} accounts={accounts} onEdit={setSheet} onEditAccount={setAdetail} onAddAccount={() => setAsheet({})}
          remind={accounts.length > 0 && curMonth() !== stmtMonth} onImportStatement={() => setStmtOpen(true)} onDismissRemind={markStmtMonth} />}
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

      {sheet && <TxSheet initial={sheet} accounts={accounts} defaultAccount={defAccount} onClose={() => setSheet(null)} onSave={saveTx} onDelete={delTx} />}
      {bsheet && (
        <BudgetSheet initial={bsheet} existing={budgets.map((b) => b.cat)}
          onClose={() => setBsheet(null)} onSave={saveBudget} onDelete={delBudget} />
      )}
      {gsheet && (
        <GoalSheet initial={gsheet} onClose={() => setGsheet(null)}
          onCreate={saveGoal} onContribute={contribute} onDelete={delGoal} />
      )}
      {syncOpen && <SyncSheet onClose={() => setSyncOpen(false)} onImported={importMany} />}
      {stmtOpen && (
        <StatementSheet accounts={accounts} onClose={() => setStmtOpen(false)}
          onImported={importMany} onSetBalance={setAccountBalance} onDone={markStmtMonth} />
      )}
      {asheet && <AccountSheet initial={asheet} onClose={() => setAsheet(null)} onSave={saveAccount} onDelete={delAccount} />}
      {adetail && (
        <AccountDetail account={accounts.find((a) => a.id === adetail.id) || adetail} tx={tx}
          onClose={() => setAdetail(null)}
          onEditAccount={(a) => { setAdetail(null); setAsheet(a) }}
          onEditTx={(t) => { setAdetail(null); setSheet(t) }} />
      )}
      {profileOpen && (
        <ProfileSheet meta={meta} avatar={avatar} email={session?.user?.email || ''} accounts={accounts} dark={dark} hasPin={!!getPin()}
          onToggleTheme={toggleTheme} onLogout={logout} onSaveProfile={updateProfile}
          defAccount={defAccount} onDefAccount={chooseDefaultAccount}
          onEnablePin={setPinStore} onDisablePin={disablePin} onClose={() => setProfileOpen(false)} />
      )}
    </div>
  )

  return (
    <>
      {content}
      <div className={'veil' + (veil ? ' show' : '')} aria-hidden="true">
        <div className="veil-inner"><Icon name="wallet" size={40} /><span>Hasta luego</span></div>
      </div>
      {locked && <LockScreen onUnlock={() => setLocked(false)} />}
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

function TxSheet({ initial, accounts = [], defaultAccount = '', onClose, onSave, onDelete }) {
  const editing = !!initial?.id
  const [type, setType] = useState(editing ? (initial.amount < 0 ? 'gasto' : 'ingreso') : 'gasto')
  const [raw, setRaw] = useState(editing ? String(Math.abs(initial.amount)) : '')
  const [cat, setCat] = useState(initial?.cat || 'mercado')
  const [account, setAccount] = useState(initial?.account || defaultAccount || accounts[0]?.id || '')
  const [open, setOpen] = useState(false)
  const opts = categories.filter((c) => (type === 'ingreso' ? c.id === 'ingreso' : c.id !== 'ingreso'))
  const amount = Number(raw || 0)
  const selIdx = Math.max(0, opts.findIndex((o) => o.id === cat))

  useEffect(() => { const id = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setOpen(false); setTimeout(onClose, 280) }
  const save = () => {
    if (!amount) return
    const c = opts.find((o) => o.id === cat) || opts[0]
    onSave({ id: initial?.id, cat: c.id, name: c.label, amount: type === 'gasto' ? -amount : amount, account: account || null })
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
        {accounts.length > 0 && (
          <>
            <div className="cat-lbl">Cuenta</div>
            <div className="acct-pick">
              {accounts.map((a) => {
                const k = acctKind(a.kind)
                return (
                  <button type="button" key={a.id} className={'apill' + (account === a.id ? ' sel' : '')} onClick={() => setAccount(a.id)}>
                    <span className={'apic ' + k.tint}><Icon name={k.icon} size={14} /></span>{a.name}
                  </button>
                )
              })}
            </div>
          </>
        )}
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

function AccountSheet({ initial, onClose, onSave, onDelete }) {
  const editing = !!initial?.id
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initial?.name || '')
  const [kind, setKind] = useState(initial?.kind || 'billetera')
  const [raw, setRaw] = useState(editing ? String(Math.round(initial.balance)) : '')
  const balance = Number(raw || 0)

  useEffect(() => { const id = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setOpen(false); setTimeout(onClose, 280) }
  const save = () => { if (name.trim()) onSave({ id: initial?.id, name: name.trim(), kind, balance }) }

  return (
    <div className={'scrim' + (open ? ' open' : '')} onClick={close}>
      <div className={'sheet' + (open ? ' open' : '')} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Cuenta">
        <div className="grab" />
        <button className="sheet-x" onClick={close} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        <div className="sheet-head">
          <span>{editing ? 'Editar cuenta' : 'Nueva cuenta'}</span>
          {editing && (
            <button className="del-btn" onClick={() => onDelete(initial.id)} aria-label="Borrar">
              <Icon name="trash" size={16} /> Borrar
            </button>
          )}
        </div>
        <div className="cardvis-wrap"><CardVisual name={name} balance={balance} kind={kind} /></div>
        <div className="cat-lbl" style={{ marginTop: 0 }}>Tipo</div>
        <div className="kinds">
          {acctKinds.map((k) => (
            <button type="button" key={k.id} className={'kind' + (kind === k.id ? ' sel' : '')} onClick={() => setKind(k.id)}>
              <span className={'ki ' + k.tint}><Icon name={k.icon} size={20} /></span>
              <span className="kl">{k.label}</span>
            </button>
          ))}
        </div>
        <div className="cat-lbl">Nombre</div>
        <input className="text-in" value={name} maxLength={24}
          onChange={(e) => setName(e.target.value)} placeholder="Ej: Nequi, Daviplata, Bancolombia" />
        <div className="cat-lbl">Saldo actual</div>
        <div className="amount-in"><span className="cur">$</span><span className="num tnum">{balance ? balance.toLocaleString('es-CO') : '0'}</span></div>
        <Keypad onKey={pressDigits(setRaw)} />
        <button className="savebtn" disabled={!name.trim()} onClick={save}>
          {editing ? 'Guardar cambios' : 'Crear cuenta'}
        </button>
      </div>
    </div>
  )
}

function AccountDetail({ account, tx, onClose, onEditAccount, onEditTx }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setOpen(false); setTimeout(onClose, 280) }

  const mine = tx.filter((t) => t.account === account.id)
  const ingresos = mine.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const gastos = mine.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)

  return (
    <div className={'scrim' + (open ? ' open' : '')} onClick={close}>
      <div className={'sheet detail' + (open ? ' open' : '')} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Detalle de cuenta">
        <div className="grab" />
        <button className="sheet-x" onClick={close} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        <div className="sheet-head">
          <span>Detalle de cuenta</span>
          <button className="edit-btn" onClick={() => onEditAccount(account)}><Icon name="pencil" size={14} /> Editar</button>
        </div>
        <div className="cardvis-wrap ani a1"><CardVisual name={account.name} balance={account.balance} kind={account.kind} /></div>
        <div className="acc-sum ani a2">
          <div><span><Icon name="down" size={13} /> Ingresos</span><b className="in">{money(ingresos)}</b></div>
          <div><span><Icon name="up" size={13} /> Gastos</span><b>{money(gastos)}</b></div>
        </div>
        <div className="cat-lbl ani a3">Movimientos de esta cuenta</div>
        {mine.length === 0 ? (
          <div className="ani a4" style={{ textAlign: 'center', padding: '10px 0 12px' }}>
            <div className="empty-ic" style={{ margin: '0 auto 10px' }}><Icon name="clock" size={26} /></div>
            <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Todavía no hay movimientos con esta cuenta.</p>
          </div>
        ) : (
          <div className="txlist ani a4">
            {mine.map((t) => {
              const c = catById(t.cat)
              return (
                <button className="tx" key={t.id} onClick={() => onEditTx(t)}>
                  <div className={'ic ' + c.tint}><Icon name={c.icon} size={19} /></div>
                  <div className="mid">
                    <div className="nm">{t.name}</div>
                    <div className="mt">{c.label}</div>
                  </div>
                  <div className={'amt tnum ' + (t.amount > 0 ? 'in' : '')}>
                    {t.amount > 0 ? '+' : '−'}{money(t.amount)}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatementSheet({ accounts, onClose, onImported, onSetBalance, onDone }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(accounts.length ? 'pick' : 'noacc')
  const [file, setFile] = useState(null)
  const [pass, setPass] = useState('')
  const [items, setItems] = useState([])
  const [saldo, setSaldo] = useState(null)
  const [sel, setSel] = useState({})
  const [cat, setCat] = useState('mercado')
  const [account, setAccount] = useState(accounts[0]?.id || '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const opts = categories.filter((c) => c.id !== 'ingreso')

  useEffect(() => { const id = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setOpen(false); setTimeout(onClose, 280) }

  const keyOf = (i) => `${i.date}|${i.desc}|${i.amount}`
  const onPick = (e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setErr(''); setStep('ask') } }

  const read = async () => {
    setStep('parsing'); setErr('')
    try {
      const { readStatement } = await import('./lib/statement.js')
      const { items: found, saldo: sa } = await readStatement(file, pass)
      const done = new Set(JSON.parse(localStorage.getItem('bolsillo.stmtids') || '[]'))
      const fresh = found.filter((i) => !done.has(keyOf(i)))
      setSaldo(sa)
      if (!found.length) { setStep('empty'); return }
      if (!fresh.length) { setStep('empty'); return }
      setItems(fresh)
      setSel(Object.fromEntries(fresh.map((i) => [keyOf(i), true])))
      setStep('list')
    } catch (e) {
      const pw = e && (e.name === 'PasswordException' || /password/i.test(e.message || ''))
      setErr(pw ? 'Contraseña incorrecta. Es tu número de documento, sin puntos.' : (e.message || 'No pude leer el PDF.'))
      setStep('ask')
    }
  }

  const toggle = (k) => setSel((x) => ({ ...x, [k]: !x[k] }))
  const chosen = items.filter((i) => sel[keyOf(i)])

  const doImport = async () => {
    if (!chosen.length || !account) return
    setBusy(true)
    const payload = chosen.map((i) => ({ cat: i.amount > 0 ? 'ingreso' : cat, name: i.desc, amount: i.amount, account, occurred_at: i.date + 'T12:00:00' }))
    try {
      const added = await addManyTransactions(payload)
      const done = new Set(JSON.parse(localStorage.getItem('bolsillo.stmtids') || '[]'))
      chosen.forEach((i) => done.add(keyOf(i)))
      localStorage.setItem('bolsillo.stmtids', JSON.stringify([...done]))
      onImported(added)
      if (saldo != null) await onSetBalance(account, saldo)
      onDone && onDone()
      close()
    } catch (e) { setErr(e.message); setStep('error'); setBusy(false) }
  }

  return (
    <div className={'scrim' + (open ? ' open' : '')} onClick={close}>
      <div className={'sheet' + (open ? ' open' : '')} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Importar extracto">
        <div className="grab" />
        <button className="sheet-x" onClick={close} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        <div className="sheet-head"><span>Importar extracto</span></div>

        {step === 'noacc' && (
          <div className="sync-center">
            <div className="empty-ic"><Icon name="doc" size={30} /></div>
            <p className="sync-msg">Primero creá una cuenta (Nequi, Daviplata…) para asignarle los movimientos del extracto.</p>
          </div>
        )}

        {step === 'pick' && (
          <div className="sync-center">
            <div className="empty-ic"><Icon name="doc" size={30} /></div>
            <p className="sync-msg">Subí el extracto PDF de Nequi. Lo abro acá mismo con tu contraseña; nunca se guarda.</p>
            <label className="savebtn" style={{ cursor: 'pointer' }}>
              Elegir PDF
              <input type="file" accept="application/pdf" onChange={onPick} style={{ display: 'none' }} />
            </label>
          </div>
        )}

        {step === 'ask' && (
          <>
            <p className="sync-msg" style={{ marginTop: 4 }}><b>{file?.name}</b></p>
            <div className="cat-lbl" style={{ marginTop: 6 }}>Contraseña del PDF (tu número de documento, sin puntos)</div>
            <input className="text-in" type="password" inputMode="numeric" value={pass}
              onChange={(e) => setPass(e.target.value)} placeholder="Ej: 1002345678" autoFocus />
            {err && <p className="sync-msg" style={{ color: 'var(--expense)' }}>{err}</p>}
            <button className="savebtn" disabled={!pass} onClick={read} style={{ marginTop: 14 }}>Leer extracto</button>
          </>
        )}

        {step === 'parsing' && <p className="sync-msg">Leyendo el extracto…</p>}

        {step === 'empty' && (
          <div className="sync-center">
            <div className="empty-ic"><Icon name="doc" size={30} /></div>
            <p className="sync-msg">No encontré movimientos nuevos en este extracto (o ya los importaste antes).</p>
            <button className="savebtn ghost" onClick={() => setStep('pick')}>Elegir otro PDF</button>
          </div>
        )}

        {step === 'error' && (
          <div className="sync-center">
            <p className="sync-msg" style={{ color: 'var(--expense)' }}>{err}</p>
            <button className="savebtn ghost" onClick={() => setStep('pick')}>Reintentar</button>
          </div>
        )}

        {step === 'list' && (
          <>
            <p className="sync-msg">Encontré {items.length} movimiento{items.length === 1 ? '' : 's'}.{saldo != null ? ` Saldo del extracto: ${money(saldo)}.` : ''}</p>
            <div className="cat-lbl" style={{ marginTop: 0 }}>¿A qué cuenta?</div>
            <div className="acct-pick">
              {accounts.map((a) => {
                const k = acctKind(a.kind)
                return (
                  <button type="button" key={a.id} className={'apill' + (account === a.id ? ' sel' : '')} onClick={() => setAccount(a.id)}>
                    <span className={'apic ' + k.tint}><Icon name={k.icon} size={14} /></span>{a.name}
                  </button>
                )
              })}
            </div>
            <div className="cat-lbl">Categoría para los gastos</div>
            <div className="cats">
              {opts.map((c) => (
                <button className={'cat' + (cat === c.id ? ' sel' : '')} key={c.id} onClick={() => setCat(c.id)}>
                  <div className={'cc ' + c.tint}><Icon name={c.icon} size={21} /></div>
                  <span className="cl">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="sync-list">
              {items.map((i) => {
                const k = keyOf(i)
                return (
                  <button key={k} type="button" className={'sync-row' + (sel[k] ? ' on' : '')} onClick={() => toggle(k)}>
                    <span className="chk">{sel[k] && <Icon name="check" size={13} />}</span>
                    <span className="mid"><span className="nm">{i.desc}</span><span className="mt">{i.date}</span></span>
                    <span className={'amt tnum ' + (i.amount > 0 ? 'in' : '')}>{i.amount > 0 ? '+' : '−'}{money(i.amount)}</span>
                  </button>
                )
              })}
            </div>
            <button className="savebtn" disabled={!chosen.length || !account || busy} onClick={doImport}>
              {busy ? 'Importando…' : `Importar ${chosen.length} movimiento${chosen.length === 1 ? '' : 's'}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const pin4 = (setRaw) => (k) => {
  if (k === 'del') setRaw((r) => r.slice(0, -1))
  else if (k !== '000') setRaw((r) => (r.length < 4 ? r + k : r))
}

function Dots({ n }) {
  return <div className="pin-dots">{[0, 1, 2, 3].map((i) => <span key={i} className={i < n ? 'on' : ''} />)}</div>
}

function ProfileSheet({ meta, avatar: avatar0, email, accounts, dark, hasPin, onToggleTheme, onLogout, onSaveProfile, defAccount, onDefAccount, onEnablePin, onDisablePin, onClose }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(meta.full_name || meta.name || '')
  const [avatar, setAvatar] = useState(avatar0 || '')
  const [pinSet, setPinSet] = useState(hasPin)
  const [pinMode, setPinMode] = useState(false)
  const [pinRaw, setPinRaw] = useState('')
  const [avMenu, setAvMenu] = useState(false)
  const [viewing, setViewing] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { const id = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(id) }, [])
  const close = () => { setOpen(false); setTimeout(onClose, 280) }
  const avatarTap = () => { if (avatar) setAvMenu((v) => !v); else fileRef.current?.click() }

  const pickPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    try { const url = await fileToAvatar(f); setAvatar(url); onSaveProfile({ avatar_url: url }) } catch { /* nd */ }
  }
  useEffect(() => {
    if (pinMode && pinRaw.length === 4) { onEnablePin(pinRaw); setPinSet(true); setPinMode(false); setPinRaw('') }
  }, [pinRaw, pinMode, onEnablePin])

  return (
    <div className={'scrim' + (open ? ' open' : '')} onClick={close}>
      <div className={'sheet' + (open ? ' open' : '')} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Perfil">
        <div className="grab" />
        <button className="sheet-x" onClick={close} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        <div className="sheet-head"><span>Perfil</span></div>

        <div className="prof-top">
          <div className="prof-av-wrap">
            <button type="button" className="prof-av" onClick={avatarTap} aria-label="Foto de perfil">
              {avatar ? <img src={avatar} alt="Perfil" /> : <Icon name="user" size={34} />}
            </button>
            <span className="prof-cam"><Icon name="camera" size={13} /></span>
            {avMenu && (
              <div className="av-menu">
                <button type="button" onClick={() => { setAvMenu(false); setViewing(true) }}>Ver foto</button>
                <button type="button" onClick={() => { setAvMenu(false); fileRef.current?.click() }}>Cambiar foto</button>
                <button type="button" className="danger" onClick={() => { setAvMenu(false); setAvatar(''); onSaveProfile({ avatar_url: '' }) }}>Quitar foto</button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />
          </div>
          <div className="prof-id">
            <input className="text-in prof-name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== (meta.full_name || meta.name) && onSaveProfile({ full_name: name.trim() })}
              placeholder="Tu nombre" />
            {email && <div className="prof-mail">{email}</div>}
          </div>
        </div>

        <div className="cat-lbl">Preferencias</div>
        <button className="prof-row" onClick={onToggleTheme}>
          <span className="pr-ic"><Icon name={dark ? 'moon' : 'sun'} size={17} /></span>
          <span className="pr-tx">Tema</span>
          <span className="pr-val">{dark ? 'Oscuro' : 'Claro'}</span>
        </button>
        {accounts.length > 0 && (
          <>
            <div className="pr-sub">Cuenta por defecto para nuevos movimientos</div>
            <div className="acct-pick">
              <button type="button" className={'apill' + (!defAccount ? ' sel' : '')} onClick={() => onDefAccount('')}>Ninguna</button>
              {accounts.map((a) => {
                const k = acctKind(a.kind)
                return (
                  <button type="button" key={a.id} className={'apill' + (defAccount === a.id ? ' sel' : '')} onClick={() => onDefAccount(a.id)}>
                    <span className={'apic ' + k.tint}><Icon name={k.icon} size={14} /></span>{a.name}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="cat-lbl">Seguridad</div>
        {pinMode ? (
          <div className="pin-set">
            <div className="pin-msg">Elegí un PIN de 4 dígitos</div>
            <Dots n={pinRaw.length} />
            <Keypad onKey={pin4(setPinRaw)} />
            <button className="savebtn ghost" onClick={() => { setPinMode(false); setPinRaw('') }}>Cancelar</button>
          </div>
        ) : (
          <button className="prof-row" onClick={() => (pinSet ? (onDisablePin(), setPinSet(false)) : setPinMode(true))}>
            <span className="pr-ic"><Icon name="lock" size={17} /></span>
            <span className="pr-tx">Bloqueo con PIN</span>
            <span className={'pr-val' + (pinSet ? ' on' : '')}>{pinSet ? 'Activado · Quitar' : 'Activar'}</span>
          </button>
        )}

        <button className="savebtn ghost prof-out" onClick={onLogout}>
          <Icon name="logout" size={16} /> Cerrar sesión
        </button>
        {viewing && avatar && (
          <div className="av-view" onClick={() => setViewing(false)}>
            <img src={avatar} alt="Perfil" />
          </div>
        )}
      </div>
    </div>
  )
}

function LockScreen({ onUnlock }) {
  const [raw, setRaw] = useState('')
  const [err, setErr] = useState(false)
  useEffect(() => {
    if (raw.length < 4) return
    if (checkPin(raw)) onUnlock()
    else { setErr(true); setTimeout(() => { setErr(false); setRaw('') }, 500) }
  }, [raw, onUnlock])
  return (
    <div className="lock">
      <div className="lock-in">
        <div className="lock-logo"><Icon name="wallet" size={34} /></div>
        <div className="lock-title">Bolsillo</div>
        <div className="lock-msg">{err ? 'PIN incorrecto' : 'Ingresá tu PIN'}</div>
        <div className={err ? 'shakeflash' : ''}><Dots n={raw.length} /></div>
        <Keypad onKey={pin4(setRaw)} />
      </div>
    </div>
  )
}
