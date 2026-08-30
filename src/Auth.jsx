import { useState } from 'react'
import { supabase } from './lib/supabase.js'
import Icon from './icons.jsx'

const traducir = (m) =>
  /invalid login/i.test(m) ? 'Correo o contraseña incorrectos.'
  : /already registered/i.test(m) ? 'Ese correo ya tiene una cuenta. Entrá.'
  : /email not confirmed/i.test(m) ? 'Falta confirmar tu correo.'
  : /at least 6/i.test(m) ? 'La contraseña necesita mínimo 6 caracteres.'
  : m

export default function Auth() {
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [switching, setSwitching] = useState(false)

  const toggleMode = () => {
    setMsg(null); setPass2('')
    setSwitching(true)
    setTimeout(() => {
      setMode((m) => (m === 'in' ? 'up' : 'in'))
      setSwitching(false)
    }, 160)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (mode === 'up' && pass !== pass2) {
      setMsg({ type: 'err', text: 'Las contraseñas no coinciden.' })
      return
    }
    setBusy(true); setMsg(null)
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password: pass })
        : await supabase.auth.signUp({ email, password: pass })
    if (error) setMsg({ type: 'err', text: traducir(error.message) })
    else if (mode === 'up' && !data.session) setMsg({ type: 'ok', text: 'Revisá tu correo para confirmar la cuenta.' })
    setBusy(false)
  }

  const sw = 'swapp' + (switching ? ' fading' : '')

  return (
    <div className="auth">
      <div className="auth-logo">🪙</div>
      <h1 className="auth-title">Bolsillo</h1>
      <p className={'auth-sub ' + sw}>{mode === 'in' ? 'Entrá a tu cuenta' : 'Creá tu cuenta'}</p>

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

        {/* Campo extra solo al registrarse */}
        <div className={'grow' + (mode === 'up' ? ' open' : '')}>
          <div className="grow-inner">
            <div className="field">
              <Icon name="lock" size={18} />
              <input type={show ? 'text' : 'password'} placeholder="Repetir contraseña"
                value={pass2} minLength={6} required={mode === 'up'} autoComplete="new-password"
                onChange={(e) => setPass2(e.target.value)} />
            </div>
          </div>
        </div>

        <button className="savebtn" disabled={busy}>
          {busy
            ? <span className="spin" aria-label="Cargando" />
            : <span className={sw}>{mode === 'in' ? 'Entrar' : 'Crear cuenta'}</span>}
        </button>
      </form>

      {msg && <p className={'auth-msg ' + msg.type}>{msg.text}</p>}

      <button className="auth-switch" onClick={toggleMode}>
        <span className={sw}>{mode === 'in' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Entrá'}</span>
      </button>
    </div>
  )
}
