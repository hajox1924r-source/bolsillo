import { useState } from 'react'
import { supabase } from './lib/supabase.js'

export default function Auth() {
  const [mode, setMode] = useState('in') // 'in' = entrar, 'up' = crear cuenta
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg('')
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password: pass })
        : await supabase.auth.signUp({ email, password: pass })
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg('Revisá tu correo para confirmar la cuenta.')
    // Si hay sesión, onAuthStateChange en App muestra la app automáticamente.
    setBusy(false)
  }

  return (
    <div className="auth">
      <div className="auth-logo">🪙</div>
      <h1 className="auth-title">Bolsillo</h1>
      <p className="auth-sub">{mode === 'in' ? 'Entrá a tu cuenta' : 'Creá tu cuenta'}</p>
      <form className="auth-form" onSubmit={submit}>
        <input type="email" placeholder="Correo" value={email} required
          autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Contraseña (mín. 6)" value={pass} required
          minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          onChange={(e) => setPass(e.target.value)} />
        <button className="savebtn" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'in' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>
      {msg && <p className="auth-msg">{msg}</p>}
      <button className="auth-switch" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }}>
        {mode === 'in' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Entrá'}
      </button>
    </div>
  )
}
