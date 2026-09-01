import Icon from './icons.jsx'
import { money, catById, acctKind } from './data.js'

// Vista tipo tarjeta: chip, número enmascarado, nombre y saldo. Se usa en Inicio y en el editor.
export function CardVisual({ name, balance, kind }) {
  const k = acctKind(kind)
  return (
    <div className={'cardvis ' + kind}>
      <div className="cv-top"><span className="cv-chip" /><Icon name={k.icon} size={18} /></div>
      <div className="cv-num">•••• •••• •••• ••••</div>
      <div className="cv-bot">
        <span className="cv-name">{name || 'Sin nombre'}</span>
        <span className="cv-bal tnum">{balance < 0 ? '−' : ''}{money(balance)}</span>
      </div>
    </div>
  )
}

const pct = (a, b) => Math.min(100, Math.round((a / b) * 100))
const fmtDay = (iso) =>
  new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })

// Color por categoría para las gráficas.
const CAT_COLOR = {
  mercado: '#D65B45', comida: '#E8A23C', transporte: '#3E74B8',
  hogar: '#14634F', ocio: '#7C5CC2', ingreso: '#2E9E6B',
}

export function Home({ tx, accounts = [], onEdit, onEditAccount, onAddAccount }) {
  const ingresos = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const gastos = tx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  // El balance es la suma de lo que hay en cada cuenta (lo mantenés vos). Sin cuentas, cae al flujo.
  const balance = accounts.length ? accounts.reduce((s, a) => s + a.balance, 0) : ingresos + gastos
  const days = [...new Set(tx.map((t) => fmtDay(t.occurred_at)))]

  return (
    <>
      <div className="balcard">
        <div className="lbl">Balance total</div>
        <div className="amount tnum">{balance < 0 ? '−' : ''}{money(balance)}</div>
        <div className="sub">{tx.length} movimiento{tx.length === 1 ? '' : 's'}</div>
        <div className="flowrow">
          <div className="flowchip"><div className="k">Ingresos</div><div className="v tnum">{money(ingresos)}</div></div>
          <div className="flowchip"><div className="k">Gastos</div><div className="v tnum">{money(gastos)}</div></div>
        </div>
      </div>

      <div className="sec-h"><h3>Cuentas</h3><button className="link-add" onClick={onAddAccount}>+ Cuenta</button></div>
      <div className="acards">
        {accounts.map((a) => (
          <button className="acard" key={a.id} onClick={() => onEditAccount(a)}>
            <CardVisual name={a.name} balance={a.balance} kind={a.kind} />
          </button>
        ))}
        <button className="acard-add" onClick={onAddAccount}>
          <Icon name="plus" size={20} /><span>Agregar cuenta</span>
        </button>
      </div>

      <div className="sec-h"><h3>Movimientos</h3></div>
      {tx.length === 0 ? (
        <div className="empty">
          <div className="empty-ic"><Icon name="wallet" size={30} /></div>
          <p>Todavía no registraste nada.<br />Tocá el botón <b>+</b> para tu primer movimiento.</p>
        </div>
      ) : (
        days.map((d) => (
          <div key={d}>
            <div className="daylabel">{d}</div>
            <div className="txlist">
              {tx.filter((t) => fmtDay(t.occurred_at) === d).map((t) => {
                const c = catById(t.cat)
                return (
                  <button className="tx" key={t.id} onClick={() => onEdit(t)}>
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
          </div>
        ))
      )}
    </>
  )
}

export function Reports({ tx }) {
  const gastos = tx.filter((t) => t.amount < 0)
  const total = gastos.reduce((s, t) => s - t.amount, 0)

  // Gasto por categoría
  const porCat = {}
  gastos.forEach((t) => { porCat[t.cat] = (porCat[t.cat] || 0) - t.amount })
  const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1])
  let off = 25
  const segs = cats.map(([cat, val]) => {
    const p = (val / total) * 100
    const s = { cat, val, p, off, color: CAT_COLOR[cat] || '#999' }
    off -= p
    return s
  })

  // Tendencia: últimos 6 meses
  const now = new Date()
  const meses = [...Array(6)].map((_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1))
  const tend = meses.map((d) => ({
    label: d.toLocaleDateString('es-CO', { month: 'short' }),
    value: gastos
      .filter((t) => { const x = new Date(t.occurred_at); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() })
      .reduce((s, t) => s - t.amount, 0),
  }))
  const maxM = Math.max(...tend.map((m) => m.value), 1)

  if (total === 0) {
    return (
      <>
        <h2 className="scr-title">Reportes</h2>
        <div className="empty">
          <div className="empty-ic"><Icon name="chart" size={30} /></div>
          <p>Registrá algunos gastos y acá vas a ver<br />en qué se te va la plata.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <h2 className="scr-title">Reportes</h2>

      <div className="card">
        <h4>Gasto por categoría</h4>
        <div className="donutwrap">
          <svg className="donut" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--line)" strokeWidth="6" />
            {segs.map((s) => (
              <circle key={s.cat} cx="21" cy="21" r="15.9155" fill="none" stroke={s.color} strokeWidth="6"
                strokeDasharray={`${s.p} ${100 - s.p}`} strokeDashoffset={s.off} />
            ))}
            <text x="21" y="20.5" textAnchor="middle" fontSize="5" fontWeight="700" fill="var(--ink)">{money(total)}</text>
            <text x="21" y="25.5" textAnchor="middle" fontSize="2.6" fill="var(--ink-3)">gastado</text>
          </svg>
          <div className="legend">
            {segs.map((s) => (
              <div className="lg" key={s.cat}>
                <span className="sw" style={{ background: s.color }} />
                <span className="ln">{catById(s.cat).label}</span>
                <span className="lv tnum">{Math.round(s.p)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h4>Tendencia de gasto · 6 meses</h4>
        <div className="bars">
          {tend.map((m, i) => (
            <div className={'bcol' + (i === 5 ? ' hl' : '')} key={m.label + i}>
              <div className="bar" style={{ height: Math.max(4, (m.value / maxM) * 100) + '%' }} />
              <div className="bl">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function Budgets({ tx, budgets, onEdit }) {
  const now = new Date()
  const thisMonth = (iso) => { const d = new Date(iso); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() }
  const spentByCat = {}
  tx.filter((t) => t.amount < 0 && thisMonth(t.occurred_at)).forEach((t) => { spentByCat[t.cat] = (spentByCat[t.cat] || 0) - t.amount })
  const rows = budgets.map((b) => ({ ...b, spent: spentByCat[b.cat] || 0 }))
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
  const totalLimit = rows.reduce((s, r) => s + r.limit, 0)

  if (budgets.length === 0) {
    return (
      <>
        <h2 className="scr-title">Presupuestos</h2>
        <div className="empty">
          <div className="empty-ic"><Icon name="target" size={30} /></div>
          <p>Poné un límite mensual por categoría<br />y controlá en qué se te va la plata.</p>
        </div>
        <button className="savebtn" onClick={() => onEdit({})}>Crear presupuesto</button>
      </>
    )
  }

  const gp = totalLimit ? totalSpent / totalLimit : 0
  return (
    <>
      <h2 className="scr-title">Presupuestos</h2>
      <div className="bigmeter">
        <div className="top">
          <div><div style={{ color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600 }}>Gastado este mes</div>
            <div className="big tnum">{money(totalSpent)}</div></div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>de <b className="tnum">{money(totalLimit)}</b></div>
        </div>
        <div className="track"><div className={'fill ' + (gp >= 1 ? 'over' : gp >= 0.8 ? 'warn' : '')} style={{ width: pct(totalSpent, totalLimit) + '%' }} /></div>
      </div>
      {rows.map((r) => {
        const p = r.limit ? Math.round((r.spent / r.limit) * 100) : 0
        const state = p >= 100 ? 'over' : p >= 80 ? 'warn' : 'ok'
        const c = catById(r.cat)
        return (
          <button className="budget" key={r.id} onClick={() => onEdit(r)}>
            <div className="row1">
              <div className={'ic ' + c.tint} style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center' }}>
                <Icon name={c.icon} size={17} />
              </div>
              <div className="bn">{c.label}<span className={'pill ' + state}>{p}%</span></div>
              <div className="bp"><b className="tnum">{money(r.spent)}</b><br />de {money(r.limit)}</div>
            </div>
            <div className="track"><div className={'fill ' + (state === 'ok' ? '' : state)} style={{ width: Math.min(100, p) + '%' }} /></div>
          </button>
        )
      })}
      <button className="savebtn ghost" onClick={() => onEdit({})}>+ Nuevo presupuesto</button>
    </>
  )
}

export function Goals({ goals, onEdit }) {
  const fmtDue = (d) => d
    ? new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    : 'Sin fecha límite'

  if (goals.length === 0) {
    return (
      <>
        <h2 className="scr-title">Metas</h2>
        <div className="empty">
          <div className="empty-ic"><Icon name="target" size={30} /></div>
          <p>Creá una meta de ahorro<br />y mirá cómo te vas acercando.</p>
        </div>
        <button className="savebtn" onClick={() => onEdit({})}>Crear meta</button>
      </>
    )
  }

  return (
    <>
      <h2 className="scr-title">Metas</h2>
      {goals.map((g) => {
        const p = pct(g.saved, g.target)
        return (
          <button className="goal" key={g.id} onClick={() => onEdit(g)}>
            <div className="gtop">
              <div className="gemoji"><Icon name={g.emoji} size={20} /></div>
              <div><div className="gname">{g.name}</div><div className="gsub">{fmtDue(g.due)}</div></div>
              <div className="gnums"><div className="gnow tnum">{money(g.saved)}</div><div className="gtot tnum">de {money(g.target)}</div></div>
            </div>
            <div className="track"><div className={'fill' + (p < 25 ? ' warn' : '')} style={{ width: p + '%' }} /></div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8 }}>{p}% completado</div>
          </button>
        )
      })}
      <button className="savebtn ghost" onClick={() => onEdit({})}>+ Nueva meta de ahorro</button>
    </>
  )
}
