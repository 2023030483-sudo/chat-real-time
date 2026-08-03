import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Info, MoreVertical, Search, Send, Smile } from 'lucide-react'
import {
  markConversationRead,
  sendMessage as sendFirebaseMessage,
  subscribeMembers,
  subscribeMessages,
} from '../lib/firebaseChat'
import type { ChatMessage, ConversationSummary, Profile, RoomMember } from '../types'
import { Avatar } from './Avatar'

type Props = {
  conversation: ConversationSummary
  currentUser: Profile
  onBack: () => void
  onMessageSent: () => void
  onInfo?: () => void
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatDateDivider(value: string) {
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

function roleLabel(role: RoomMember['role']) {
  if (role === 'owner') return 'Administrador'
  if (role === 'admin') return 'Moderador'
  return 'Miembro'
}

export function ChatView({ conversation, currentUser, onBack, onMessageSent, onInfo }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [members, setMembers] = useState<RoomMember[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const isGroup = conversation.type === 'group'
  const displayName = conversation.type === 'direct' ? conversation.other_user_name : conversation.title
  const displayAvatar = conversation.type === 'direct' ? conversation.other_user_avatar : conversation.avatar_url
  const subtitle = conversation.type === 'direct' ? `@${conversation.other_user_username ?? 'usuario'}` : 'Conversación grupal'

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | null = null
    setLoading(true)
    setMessages([])
    setError('')

    void subscribeMessages(
      conversation.id,
      (nextMessages) => {
        if (!active) return
        setMessages(nextMessages)
        setLoading(false)
        void markConversationRead(conversation.id, currentUser).catch(() => undefined)
      },
      (caught) => {
        if (!active) return
        setError(caught.message)
        setLoading(false)
      },
    ).then((stop) => {
      if (!active) stop()
      else unsubscribe = stop
    }).catch((caught) => {
      if (!active) return
      setError(caught instanceof Error ? caught.message : 'No fue posible cargar los mensajes.')
      setLoading(false)
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [conversation.id, currentUser.id])

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | null = null
    setMembers([])
    setMemberSearch('')
    setMembersError('')

    if (!isGroup) {
      setMembersLoading(false)
      return () => {
        active = false
      }
    }

    setMembersLoading(true)
    void subscribeMembers(
      conversation.id,
      (nextMembers) => {
        if (!active) return
        setMembers(nextMembers)
        setMembersLoading(false)
      },
      (caught) => {
        if (!active) return
        setMembersError(caught.message)
        setMembersLoading(false)
      },
    ).then((stop) => {
      if (!active) stop()
      else unsubscribe = stop
    }).catch((caught) => {
      if (!active) return
      setMembersError(caught instanceof Error ? caught.message : 'No fue posible cargar los miembros.')
      setMembersLoading(false)
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [conversation.id, isGroup])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const grouped = useMemo(() => {
    return messages.map((message, index) => {
      const previous = messages[index - 1]
      const showDate = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString()
      return { message, showDate }
    })
  }, [messages])

  const visibleMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase()
    if (!term) return members

    return members.filter((member) => {
      const name = member.profile?.full_name ?? ''
      const username = member.profile?.username ?? ''
      return name.toLowerCase().includes(term) || username.toLowerCase().includes(term)
    })
  }, [memberSearch, members])

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    const cleanBody = body.trim()
    if (!cleanBody || sending) return

    setSending(true)
    setError('')
    setBody('')

    try {
      await sendFirebaseMessage(conversation.id, currentUser, cleanBody)
      onMessageSent()
    } catch (caught) {
      setBody(cleanBody)
      setError(caught instanceof Error ? caught.message : 'No fue posible enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className={`chat-view ${isGroup ? 'chat-view--group' : ''}`}>
      <header className="chat-header">
        <button className="icon-button mobile-back" onClick={onBack} aria-label="Volver"><ArrowLeft size={21} /></button>
        <Avatar src={displayAvatar} label={displayName} />
        <div className="chat-header__identity">
          <strong>{displayName || 'Conversación'}</strong>
          <small>{subtitle}</small>
        </div>
        <button className="icon-button chat-header__more" type="button" onClick={onInfo} disabled={!onInfo} aria-label={onInfo ? 'Información de la sala' : 'Más opciones'}><MoreVertical size={20} /></button>
      </header>

      <div className={`chat-content-layout ${isGroup ? 'chat-content-layout--group' : 'chat-content-layout--direct'}`}>
        {isGroup ? (
          <aside className="room-members-sidebar">
            <label className="room-members-search">
              <Search size={15} />
              <input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Buscar miembro"
              />
            </label>

            <div className="room-members-heading">
              Miembros {members.length > 0 ? `(${members.length})` : ''}
            </div>

            <div className="room-members-list">
              {membersLoading ? <p className="room-members-status">Cargando miembros…</p> : null}
              {membersError ? <p className="room-members-status room-members-status--error">No fue posible cargar los miembros.</p> : null}
              {!membersLoading && !membersError && visibleMembers.length === 0 ? (
                <p className="room-members-status">No se encontraron miembros.</p>
              ) : null}

              {visibleMembers.map((member) => {
                const memberName = member.profile?.full_name || member.profile?.username || 'Usuario'
                return (
                  <div className="room-member-row" key={member.user_id}>
                    <Avatar profile={member.profile} size="sm" />
                    <span>
                      <strong>{memberName}</strong>
                      <small>{roleLabel(member.role)}</small>
                    </span>
                  </div>
                )
              })}
            </div>

            <button className="room-members-info-button" type="button" onClick={onInfo}>
              <Info size={16} />
              <span>Información de la sala</span>
            </button>
          </aside>
        ) : null}

        <div className="chat-conversation-column">
          <div className="messages-area">
            {loading ? <p className="muted-copy muted-copy--center">Cargando mensajes…</p> : null}
            {!loading && messages.length === 0 ? (
              <div className="chat-empty">
                <Avatar src={displayAvatar} label={displayName} size="xl" />
                <h2>{displayName}</h2>
                <p>Esta es una conversación nueva. Envía el primer mensaje.</p>
              </div>
            ) : null}

            <div className="message-stream">
              {grouped.map(({ message, showDate }) => {
                const mine = message.sender_id === currentUser.id
                return (
                  <div key={message.id}>
                    {showDate ? <div className="date-divider"><span>{formatDateDivider(message.created_at)}</span></div> : null}
                    <div className={`message-line ${mine ? 'message-line--mine' : ''}`}>
                      {!mine ? <Avatar profile={message.sender} size="sm" /> : null}
                      <div className={`message-bubble ${mine ? 'message-bubble--mine' : ''}`}>
                        <p>{message.body}</p>
                        <time>{formatMessageTime(message.created_at)}</time>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          </div>

          <footer className="composer-wrap">
            {error && <div className="composer-error">{error}</div>}
            <form className="composer" onSubmit={sendMessage}>
              <button className="icon-button" type="button" aria-label="Emoji"><Smile size={21} /></button>
              <textarea
                rows={1}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
                placeholder="Escribe un mensaje…"
                maxLength={4000}
              />
              <button className="send-button" type="submit" disabled={!body.trim() || sending} aria-label="Enviar mensaje"><Send size={20} /></button>
            </form>
          </footer>
        </div>
      </div>
    </section>
  )
}
