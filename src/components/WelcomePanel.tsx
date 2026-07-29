import { MessageCircle, MessageSquarePlus } from 'lucide-react'

type Props = { onNewChat: () => void }

export function WelcomePanel({ onNewChat }: Props) {
  return (
    <section className="welcome-panel">
      <div className="welcome-panel__illustration">
        <div className="welcome-chat-icon"><MessageCircle size={42} /></div>
        <span className="welcome-bubble welcome-bubble--one" />
        <span className="welcome-bubble welcome-bubble--two" />
      </div>
      <h2>Selecciona una conversación</h2>
      <p>Elige un chat de la lista o inicia uno nuevo para comenzar a enviar mensajes.</p>
      <button className="primary-button primary-button--compact" onClick={onNewChat}>
        <MessageSquarePlus size={19} /> Nueva conversación
      </button>
    </section>
  )
}
