import { MessageSquarePlus, Search, Settings } from 'lucide-react'
import type { ConversationSummary, Profile } from '../types'
import { Avatar } from './Avatar'

type Props = {
  profile: Profile
  conversations: ConversationSummary[]
  selectedId: string | null
  loading: boolean
  search: string
  onSearch: (value: string) => void
  onSelect: (conversation: ConversationSummary) => void
  onNewChat: () => void
  onProfile: () => void
}

function formatConversationTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
}

export function ConversationList({
  profile,
  conversations,
  selectedId,
  loading,
  search,
  onSearch,
  onSelect,
  onNewChat,
  onProfile,
}: Props) {
  const visible = conversations.filter((conversation) => {
    const term = search.toLowerCase().trim()
    if (!term) return true
    return [conversation.title, conversation.other_user_name, conversation.other_user_username, conversation.last_message]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(term))
  })

  return (
    <aside className="conversation-panel">
      <header className="app-sidebar-header">
        <button className="current-user" onClick={onProfile}>
          <Avatar profile={profile} />
          <span>
            <strong>{profile.full_name}</strong>
            <small>@{profile.username}</small>
          </span>
        </button>
        <div className="sidebar-actions">
          <button className="icon-button" onClick={onNewChat} aria-label="Nueva conversación"><MessageSquarePlus size={20} /></button>
          <button className="icon-button" onClick={onProfile} aria-label="Configuración"><Settings size={20} /></button>
        </div>
      </header>

      <div className="conversation-heading">
        <div>
          <p className="eyebrow">Mensajes</p>
          <h1>Conversaciones</h1>
        </div>
        <button className="round-primary-button" onClick={onNewChat} aria-label="Nueva conversación"><MessageSquarePlus size={20} /></button>
      </div>

      <label className="search-box search-box--sidebar">
        <Search size={18} />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar conversación" />
      </label>

      <div className="conversation-list">
        {loading ? <p className="muted-copy">Cargando conversaciones…</p> : null}
        {!loading && visible.length === 0 ? (
          <div className="list-empty">
            <div className="list-empty__icon"><MessageSquarePlus size={24} /></div>
            <strong>Aún no hay conversaciones</strong>
            <p>Busca a otro usuario para comenzar.</p>
            <button className="secondary-button" onClick={onNewChat}>Nuevo mensaje</button>
          </div>
        ) : null}

        {visible.map((conversation) => {
          const name = conversation.type === 'direct' ? conversation.other_user_name : conversation.title
          const avatar = conversation.type === 'direct' ? conversation.other_user_avatar : conversation.avatar_url
          return (
            <button
              className={`conversation-row ${selectedId === conversation.id ? 'active' : ''}`}
              key={conversation.id}
              onClick={() => onSelect(conversation)}
            >
              <Avatar src={avatar} label={name} />
              <span className="conversation-row__body">
                <span className="conversation-row__top">
                  <strong>{name || 'Conversación'}</strong>
                  <time>{formatConversationTime(conversation.last_message_at ?? conversation.updated_at)}</time>
                </span>
                <span className="conversation-row__bottom">
                  <small>{conversation.last_message || 'Comienza la conversación'}</small>
                  {conversation.unread_count > 0 ? <b>{conversation.unread_count > 99 ? '99+' : conversation.unread_count}</b> : null}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
