import Icon from './icons.jsx'
import { money, catById, accounts, budgets, goals } from './data.js'

const pct = (a, b) => Math.min(100, Math.round((a / b) * 100))

export function Home({ tx }) {
  const ingresos = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const gastos = tx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  const balance = accounts.reduce((s, a) => s + a.balance, 0)
  const days = [...new Set(tx.map((t) => t.date))]
  return (
    <>
      <div className="balcard">
        <div className="lbl">Balance total</div>
        <div className="amount tnum">{money(balance)}</div>
        <div className="sub">{accounts.length} cuentas · agosto 2026</div>
        <div className="flowrow">
          <div className="flowchip"><div className="k">Ingresos</div><div className="v tnum">{money(ingresos)}</div></div>
          <div className="flowchip"><div className="k">Gastos</div><div className="v tnum">{money(gastos)}</div></div>
        </div>
      </div>

      <div className="sec-h"><h3>Mis cuentas</h3><a>Ver todas</a></div>
      <div className="accounts">
        {accounts.map((a) => (
          <div className="acct" key={a.id}>
            <div className="an">{a.name}</div>
            <div className="av tnum">{money(a.balance)}</div>
          </div>
        ))}
      </div>

      <div className="sec-h"><h3>Movimientos</h3><a>Historial</a></div>
      {days.map((d) => (
        <div key={d}>
          <div className="daylabel">{d}</div>
          <div className="txlist">
            {tx.filter((t) => t.date === d).map((t) => {
              const c = catById(t.cat)
              return (
                <div className="tx" key={t.id}>
                  <div className={'ic ' + c.tint}><Icon name={c.icon} size={19} /></div>
                  <div className="mid">
                    <div className="nm">{t.name}</div>
                    <div className="mt">{t.account}</div>
                  </div>
                  <div className={'amt tnum ' + (t.amount > 0 ? 'in' : '')}>
                    {t.amount > 0 ? '+' : '−'}{money(t.amount)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

export function Budgets() {
  const total = budgets.reduce((s, b) => s + b.spent, 0)
  const limit = budgets.reduce((s, b) => s + b.limit, 0)
  return (
    <>
      <h2 className="scr-title">Presupuestos</h2>
      <div className="bigmeter">
        <div className="top">
          <div><div className="lbl" style={{ color: 'var(--ink-2)', fontSize: 12.5, fontWeight: 600 }}>Gastado este mes</div>
            <div className="big tnum">{money(total)}</div></div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>de <b className="tnum">{money(limit)}</b></div>
        </div>
        <div className="track"><div className="fill" style={{ width: pct(total, limit) + '%' }} /></div>
      </div>
      {budgets.map((b) => {
        const p = Math.round((b.spent / b.limit) * 100)
        const state = p >= 100 ? 'over' : p >= 80 ? 'warn' : 'ok'
        const c = catById(b.cat)
        return (
          <div className="budget" key={b.label}>
            <div className="row1">
              <div className={'ic ' + b.tint} style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center' }}>
                <Icon name={c.icon} size={17} />
              </div>
              <div className="bn">{b.label}<span className={'pill ' + state}>{p}%</span></div>
              <div className="bp"><b className="tnum">{money(b.spent)}</b><br />de {money(b.limit)}</div>
            </div>
            <div className="track"><div className={'fill ' + (state === 'ok' ? '' : state)} style={{ width: Math.min(100, p) + '%' }} /></div>
          </div>
        )
      })}
    </>
  )
}

export function Reports() {
  const bars = [
    { m: 'Mar', h: 58 }, { m: 'Abr', h: 72 }, { m: 'May', h: 64 },
    { m: 'Jun', h: 80 }, { m: 'Jul', h: 69 }, { m: 'Ago', h: 88, hl: true },
  ]
  const legend = [
    ['Mercado', '#14634F', '30%'], ['Restaurantes', '#E8A23C', '25%'],
    ['Transporte', '#3E74B8', '17%'], ['Servicios', '#7C5CC2', '16%'], ['Otros', '#D65B45', '12%'],
  ]
  return (
    <>
      <h2 className="scr-title">Reportes</h2>
      <div className="card">
        <h4>Tendencia de gasto · 6 meses</h4>
        <div className="bars">
          {bars.map((b) => (
            <div className={'bcol' + (b.hl ? ' hl' : '')} key={b.m}>
              <div className="bar" style={{ height: b.h + '%' }} />
              <div className="bl">{b.m}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h4>Gasto por categoría · agosto</h4>
        <div className="legend">
          {legend.map(([n, c, v]) => (
            <div className="lg" key={n}>
              <span className="sw" style={{ background: c }} />
              <span className="ln">{n}</span><span className="lv tnum">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function Goals() {
  return (
    <>
      <h2 className="scr-title">Metas</h2>
      {goals.map((g) => {
        const p = pct(g.now, g.total)
        return (
          <div className="goal" key={g.name}>
            <div className="gtop">
              <div className="gemoji">{g.emoji}</div>
              <div><div className="gname">{g.name}</div><div className="gsub">{g.sub}</div></div>
              <div className="gnums"><div className="gnow tnum">{money(g.now)}</div><div className="gtot tnum">de {money(g.total)}</div></div>
            </div>
            <div className="track"><div className={'fill' + (p < 25 ? ' warn' : '')} style={{ width: p + '%' }} /></div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8 }}>{p}% completado</div>
          </div>
        )
      })}
      <button className="savebtn ghost">+ Nueva meta de ahorro</button>
    </>
  )
}
