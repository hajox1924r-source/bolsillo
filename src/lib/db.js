import { supabase, hasCloud } from './supabase.js'

// La UI usa {id, cat, name, amount, occurred_at}. En la nube se mapea a columnas.
const fromRow = (r) => ({
  id: r.id, cat: r.category, name: r.description || r.category,
  amount: Number(r.amount), occurred_at: r.occurred_at, account: r.account_id ?? null,
})

const KEY = 'bolsillo.tx'
const local = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }

export async function getTransactions() {
  if (!hasCloud) return local()
  const { data, error } = await supabase
    .from('transactions').select('*').order('occurred_at', { ascending: false })
  if (error) throw error
  return data.map(fromRow)
}

export async function addTransaction({ cat, name, amount, account }) {
  if (!hasCloud) {
    const row = { id: Date.now(), cat, name, amount, account: account || null, occurred_at: new Date().toISOString() }
    localStorage.setItem(KEY, JSON.stringify([row, ...local()]))
    return row
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('transactions')
    .insert({ user_id: user.id, category: cat, description: name, amount, account_id: account || null })
    .select().single()
  if (error) throw error
  return fromRow(data)
}

export async function updateTransaction(id, { cat, name, amount, account }) {
  if (!hasCloud) {
    const list = local().map((t) => (t.id === id ? { ...t, cat, name, amount, account: account || null } : t))
    localStorage.setItem(KEY, JSON.stringify(list))
    return list.find((t) => t.id === id)
  }
  const { data, error } = await supabase.from('transactions')
    .update({ category: cat, description: name, amount, account_id: account || null }).eq('id', id).select().single()
  if (error) throw error
  return fromRow(data)
}

export async function deleteTransaction(id) {
  if (!hasCloud) {
    localStorage.setItem(KEY, JSON.stringify(local().filter((t) => t.id !== id)))
    return
  }
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

// ---------- Presupuestos ----------
const BKEY = 'bolsillo.budgets'
const localB = () => { try { return JSON.parse(localStorage.getItem(BKEY)) || [] } catch { return [] } }
const fromB = (r) => ({ id: r.id, cat: r.category, limit: Number(r.limit_amount) })

export async function getBudgets() {
  if (!hasCloud) return localB()
  const { data, error } = await supabase.from('budgets').select('*')
  if (error) throw error
  return data.map(fromB)
}

export async function upsertBudget(cat, limit) {
  if (!hasCloud) {
    const list = localB()
    const i = list.findIndex((b) => b.cat === cat)
    const row = { id: i >= 0 ? list[i].id : Date.now(), cat, limit }
    if (i >= 0) list[i] = row; else list.push(row)
    localStorage.setItem(BKEY, JSON.stringify(list))
    return row
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('budgets')
    .upsert({ user_id: user.id, category: cat, limit_amount: limit }, { onConflict: 'user_id,category' })
    .select().single()
  if (error) throw error
  return fromB(data)
}

export async function deleteBudget(id) {
  if (!hasCloud) {
    localStorage.setItem(BKEY, JSON.stringify(localB().filter((b) => b.id !== id)))
    return
  }
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) throw error
}

// ---------- Metas ----------
const GKEY = 'bolsillo.goals'
const localG = () => { try { return JSON.parse(localStorage.getItem(GKEY)) || [] } catch { return [] } }
const fromG = (r) => ({ id: r.id, name: r.name, emoji: r.emoji, target: Number(r.target_amount), saved: Number(r.saved_amount), due: r.due_date })

export async function getGoals() {
  if (!hasCloud) return localG()
  const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data.map(fromG)
}

export async function createGoal({ name, emoji, target, due }) {
  if (!hasCloud) {
    const row = { id: Date.now(), name, emoji, target, saved: 0, due: due || null }
    localStorage.setItem(GKEY, JSON.stringify([...localG(), row]))
    return row
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('goals')
    .insert({ user_id: user.id, name, emoji, target_amount: target, saved_amount: 0, due_date: due || null })
    .select().single()
  if (error) throw error
  return fromG(data)
}

export async function contributeGoal(goal, amount) {
  const nuevo = Number(goal.saved) + amount
  if (!hasCloud) {
    const list = localG().map((g) => (g.id === goal.id ? { ...g, saved: nuevo } : g))
    localStorage.setItem(GKEY, JSON.stringify(list))
    return list.find((g) => g.id === goal.id)
  }
  const { data, error } = await supabase.from('goals')
    .update({ saved_amount: nuevo }).eq('id', goal.id).select().single()
  if (error) throw error
  return fromG(data)
}

export async function deleteGoal(id) {
  if (!hasCloud) {
    localStorage.setItem(GKEY, JSON.stringify(localG().filter((g) => g.id !== id)))
    return
  }
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

export async function addManyTransactions(items) {
  if (!hasCloud) {
    const rows = items.map((t, i) => ({ id: Date.now() + i, cat: t.cat, name: t.name, amount: t.amount, account: t.account || null, occurred_at: t.occurred_at }))
    localStorage.setItem(KEY, JSON.stringify([...rows, ...local()]))
    return rows
  }
  const { data: { user } } = await supabase.auth.getUser()
  const payload = items.map((t) => ({ user_id: user.id, category: t.cat, description: t.name, amount: t.amount, account_id: t.account || null, occurred_at: t.occurred_at }))
  const { data, error } = await supabase.from('transactions').insert(payload).select()
  if (error) throw error
  return data.map(fromRow)
}

// ---------- Cuentas ----------
const AKEY = 'bolsillo.accounts'
const localA = () => { try { return JSON.parse(localStorage.getItem(AKEY)) || [] } catch { return [] } }
const fromA = (r) => ({ id: r.id, name: r.name, kind: r.kind, balance: Number(r.balance) })

export async function getAccounts() {
  if (!hasCloud) return localA()
  const { data, error } = await supabase.from('accounts').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data.map(fromA)
}

export async function createAccount({ name, kind, balance }) {
  if (!hasCloud) {
    const row = { id: Date.now(), name, kind, balance }
    localStorage.setItem(AKEY, JSON.stringify([...localA(), row]))
    return row
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('accounts')
    .insert({ user_id: user.id, name, kind, balance }).select().single()
  if (error) throw error
  return fromA(data)
}

export async function updateAccount(id, { name, kind, balance }) {
  if (!hasCloud) {
    const list = localA().map((a) => (a.id === id ? { ...a, name, kind, balance } : a))
    localStorage.setItem(AKEY, JSON.stringify(list))
    return list.find((a) => a.id === id)
  }
  const { data, error } = await supabase.from('accounts')
    .update({ name, kind, balance }).eq('id', id).select().single()
  if (error) throw error
  return fromA(data)
}

export async function deleteAccount(id) {
  if (!hasCloud) {
    localStorage.setItem(AKEY, JSON.stringify(localA().filter((a) => a.id !== id)))
    return
  }
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) throw error
}
