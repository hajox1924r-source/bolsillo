import { useState } from 'react'
import { supabase } from './lib/supabase.js'
import Icon from './icons.jsx'

// Traduce los mensajes más comunes de Supabase.
const traducir = (m) =>
  /invalid login/i.test(m) ? 'Correo o contraseña incorrectos.'
  : /already registered/i.test(m) ? 'Ese correo ya tiene una cuenta. Entrá.'
  : /email not confirmed/i.test(m) ? 'Falta confirmar tu correo.'
  : /at least 6/i.test(m) ? 'La contraseña necesita mínimo 6 caracteres.'
  : m

export default function Auth() {
  const [mode, setMode] = useState('in') // 'in' = entrar, 'up' = crear cuenta
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'err'|'ok', text }
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password: pass })
        : await supabase.auth.signUp({ email, password: pass })
    if (error) setMsg({ type: 'err', text: traducir(error.message) })
    else if (mode === 'up' && !data.session) setMsg({ type: 'ok', text: 'Revisá tu correo para confirmar la cuenta.' })
    setBusy(false)
  }

  return (
    <div className="auth">
      <div className="auth-logo">🪙</div>
      <h1 className="auth-title">Bolsillo</h1>
      <p className="auth-sub" key={mode}>{mode === 'in' ? 'Entrá a tu cuenta' : 'Creá tu cuenta'}</p>

      <form className="auth-form" onSubmit={submit}>
        <div className="field">
          <Icon name="mail" size={18} />
          <input type="email" placeholder="Correo" value={email} required
            autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <Icon name="lock" size={18} />
          <input type={show ? 'text' : 'password'} placeholder="Contraseña (mín. 6)" value={pass}
            required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            onChange={(e) => setPass(e.target.value)} />
          <button type="button" className="eye" onClick={() => setShow(!show)}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <Icon key={show} name={show ? 'eyeoff' : 'eye'} size={18} />
          </button>
        </div>
        <button className="savebtn" disabled={busy}>
          {busy
            ? <span className="spin" aria-label="Cargando" />
            : <span className="btn-label" key={mode}>{mode === 'in' ? 'Entrar' : 'Crear cuenta'}</span>}
        </button>
      </form>

      {msg && <p className={'auth-msg ' + msg.type}>{msg.text}</p>}

      <button className="auth-switch" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>
        <span className="btn-label" key={mode}>{mode === 'in' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Entrá'}</span>
      </button>
    </div>
  )
}
