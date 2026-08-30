import { useState } from 'react'
import { supabase } from './lib/supabase.js'
import Icon from './icons.jsx'

const traducir = (m) =>
  /invalid login/i.test(m) ? 'Correo o contraseña incorrectos.'
  : /already registered/i.test(m) ? 'Ese correo ya tiene una cuenta. Entrá.'
  : /email not confirmed/i.test(m) ? 'Falta confirmar tu correo.'
  : /at least 6/i.test(m) ? 'La contraseña necesita mínimo 6 caracteres.'
  : m

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6.6 5.6C41.8 36.5 44 30.8 44 24c0-1.3-.1-2.3-.4-3.5z"/>
  </svg>
)

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

  const google = async () => {
    setMsg(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setMsg({ type: 'err', text: traducir(error.message) })
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
      <div className="auth-logo"><Icon name="wallet" size={34} /></div>
      <h1 className="auth-title">Bolsillo</h1>
      <p className={'auth-sub ' + sw}>{mode === 'in' ? 'Entrá a tu cuenta' : 'Creá tu cuenta'}</p>

      <button type="button" className="gbtn" onClick={google}>
        <GoogleIcon /> Continuar con Google
      </button>
      <div className="divider">o</div>

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
