import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Info, MoreVertical, Search, Send, Smile } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { ChatMessage, ConversationSummary, Profile } from '../types'
import { Avatar } from './Avatar'

type Props = {
  conversation: ConversationSummary
  currentUser: Profile
  onBack: () => void
  onMessageSent: () => void
  onInfo?: () => void
}

type RoomMember = {
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  profile: Profile | null
}

type RawRoomMember = Omit<RoomMember, 'profile'> & {
  profile: Profile | Profile[] | null
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

  const addMessage = (message: ChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) return current
      return [...current, message].sort((a, b) => a.id - b.id)
    })
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setMessages([])
    setError('')

    const loadMessages = async () => {
      const { data, error: loadError } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, message_type, created_at, updated_at, deleted_at, sender:profiles!messages_sender_id_fkey(id, username, full_name, avatar_url, status)')
        .eq('conversation_id', conversation.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(500)

      if (!active) return
      if (loadError) setError(loadError.message)
      setMessages((data ?? []) as unknown as ChatMessage[])
      setLoading(false)
      await supabase.rpc('mark_conversation_read', { conversation_uuid: conversation.id })
    }

    void loadMessages()

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        async (payload) => {
          const raw = payload.new as ChatMessage
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, status')
            .eq('id', raw.sender_id)
            .single()
          addMessage({ ...raw, sender: (sender as Profile | null) ?? null })
          await supabase.rpc('mark_conversation_read', { conversation_uuid: conversation.id })
        },
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [conversation.id])

  useEffect(() => {
    let active = true
    setMembers([])
    setMemberSearch('')
    setMembersError('')

    if (!isGroup) {
      setMembersLoading(false)
      return () => {
        active = false
      }
    }

    const loadMembers = async () => {
      setMembersLoading(true)

      const { data, error: loadError } = await supabase
        .from('conversation_members')
        .select('user_id, role, joined_at, profile:profiles!conversation_members_user_id_fkey(id, username, full_name, avatar_url, status)')
        .eq('conversation_id', conversation.id)
        .order('joined_at', { ascending: true })

      if (!active) return

      if (loadError) {
        setMembersError(loadError.message)
        setMembersLoading(false)
        return
      }

      const rows = (data ?? []) as unknown as RawRoomMember[]
      setMembers(rows.map((row) => ({
        ...row,
        profile: Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile,
      })))
      setMembersLoading(false)
    }

    void loadMembers()

    return () => {
      active = false
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

    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({ conversation_id: conversation.id, sender_id: currentUser.id, body: cleanBody })
      .select('id, conversation_id, sender_id, body, message_type, created_at, updated_at, deleted_at')
      .single()

    if (sendError) {
      setBody(cleanBody)
      setError(sendError.message)
    } else {
      addMessage({ ...(data as ChatMessage), sender: currentUser })
      onMessageSent()
    }
    setSending(false)
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
