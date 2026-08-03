import { GraduationCap, LogOut, Mail, ShieldCheck } from 'lucide-react'
import type { AuthUser, NavigationSection, Profile } from '../types'
import { Avatar } from './Avatar'
import { BottomNavigation } from './BottomNavigation'

type Props = {
  user: AuthUser
  profile: Profile
  onNavigate: (section: NavigationSection) => void
  onSignOut: () => Promise<void>
}

export function AccountPage({ user, profile, onNavigate, onSignOut }: Props) {
  return (
    <section className="section-page-shell">
      <div className="chat-aula-page account-page">
        <header className="chat-aula-brand-header">
          <div className="chat-aula-brand">
            <GraduationCap size={22} />
            <strong>Chat Aula</strong>
          </div>
          <div className="chat-aula-header-actions">
            <button className="icon-button" type="button" onClick={() => void onSignOut()} aria-label="Cerrar sesión">
              <LogOut size={18} />
            </button>
            <Avatar profile={profile} size="sm" />
          </div>
        </header>

        <div className="account-page__content">
          <header className="account-title">
            <h1>Mi cuenta</h1>
            <p>Gestiona tus preferencias de estudiante y seguridad de la cuenta.</p>
          </header>

          <article className="account-card account-card--email">
            <div className="account-card__label"><Mail size={17} /> Correo institucional</div>
            <strong>{user.email ?? 'Sin correo registrado'}</strong>
          </article>

          <article className="account-card account-card--security">
            <div className="account-card__label"><ShieldCheck size={17} /> Seguridad</div>
            <p>Sesión iniciada con Firebase Authentication</p>
            <small><span /> Protección activa</small>
          </article>

          <article className="welcome-account-card">
            <div>
              <h2>Bienvenido de nuevo</h2>
              <p>Tu historial académico y chats de estudio están sincronizados en todos tus dispositivos.</p>
            </div>
            <GraduationCap size={62} />
          </article>

          <button className="account-signout-button" type="button" onClick={() => void onSignOut()}>
            <LogOut size={21} /> Cerrar sesión
          </button>

          <p className="account-version">Chat Aula v2.4.0 · Academic Ecosystem</p>
        </div>

        <BottomNavigation active="profile" onNavigate={onNavigate} />
      </div>
    </section>
  )
}
