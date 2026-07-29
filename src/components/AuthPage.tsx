import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, MessageCircle, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'register'

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError
      } else {
        const normalizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '')
        if (normalizedUsername.length < 3) {
          throw new Error('El nombre de usuario debe tener al menos 3 caracteres válidos.')
        }

        const { data, error: signupError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName.trim(),
              username: normalizedUsername,
            },
          },
        })

        if (signupError) throw signupError
        if (!data.session) {
          setNotice('Cuenta creada. Revisa tu correo para confirmar el registro.')
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ocurrió un error inesperado.')
    } finally {
      setBusy(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
    setNotice('')
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="visual-orb visual-orb--one" />
        <div className="visual-orb visual-orb--two" />
        <div className="auth-visual__content">
          <div className="brand-mark"><MessageCircle size={28} /></div>
          <h1>Conecta en tiempo real</h1>
          <p>Mensajes privados, rápidos y protegidos desde cualquier dispositivo.</p>
          <div className="message-preview message-preview--left">¡Hola! ¿Cómo va el proyecto?</div>
          <div className="message-preview message-preview--right">Muy bien, ya casi terminamos ✨</div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card__brand">
            <div className="brand-mark brand-mark--small"><MessageCircle size={20} /></div>
            <strong>Chat Real Time</strong>
          </div>

          <header>
            <h2>{mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h2>
            <p>{mode === 'login' ? 'Ingresa para continuar conversando.' : 'Completa tus datos para comenzar.'}</p>
          </header>

          <div className="auth-tabs" role="tablist">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} type="button">
              Iniciar sesión
            </button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')} type="button">
              Registrarme
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <>
                <label>
                  Nombre completo
                  <span className="input-wrap">
                    <UserRound size={18} />
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" required />
                  </span>
                </label>
                <label>
                  Nombre de usuario
                  <span className="input-wrap">
                    <span className="input-prefix">@</span>
                    <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="usuario" minLength={3} required />
                  </span>
                </label>
              </>
            )}

            <label>
              Correo electrónico
              <span className="input-wrap">
                <Mail size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.com" autoComplete="email" required />
              </span>
            </label>

            <label>
              Contraseña
              <span className="input-wrap">
                <LockKeyhole size={18} />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
                <button type="button" className="icon-button icon-button--input" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            {error && <div className="form-message form-message--error">{error}</div>}
            {notice && <div className="form-message form-message--success">{notice}</div>}

            <button className="primary-button" disabled={busy} type="submit">
              {busy ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
