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
