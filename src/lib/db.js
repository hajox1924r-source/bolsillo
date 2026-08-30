import { supabase, hasCloud } from './supabase.js'

// La UI usa {id, cat, name, amount, occurred_at}. En la nube se mapea a columnas.
const fromRow = (r) => ({
  id: r.id, cat: r.category, name: r.description || r.category,
  amount: Number(r.amount), occurred_at: r.occurred_at,
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

export async function addTransaction({ cat, name, amount }) {
  if (!hasCloud) {
    const row = { id: Date.now(), cat, name, amount, occurred_at: new Date().toISOString() }
    localStorage.setItem(KEY, JSON.stringify([row, ...local()]))
    return row
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('transactions')
    .insert({ user_id: user.id, category: cat, description: name, amount })
    .select().single()
  if (error) throw error
  return fromRow(data)
}

export async function updateTransaction(id, { cat, name, amount }) {
  if (!hasCloud) {
    const list = local().map((t) => (t.id === id ? { ...t, cat, name, amount } : t))
    localStorage.setItem(KEY, JSON.stringify(list))
    return list.find((t) => t.id === id)
  }
  const { data, error } = await supabase.from('transactions')
    .update({ category: cat, description: name, amount }).eq('id', id).select().single()
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
