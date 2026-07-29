import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { ConversationSummary } from '../types'
import { ConversationList } from './ConversationList'
import { ChatView } from './ChatView'
import { WelcomePanel } from './WelcomePanel'
import { NewChatModal } from './NewChatModal'
import { ProfileModal } from './ProfileModal'

export function ChatShell() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selected, setSelected] = useState<ConversationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const loadConversations = useCallback(async (selectId?: string) => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_my_conversations')
    if (error) {
      console.error('No fue posible cargar las conversaciones:', error.message)
      setLoading(false)
      return
    }

    const next = ((data ?? []) as ConversationSummary[]).map((item) => ({
      ...item,
      unread_count: Number(item.unread_count ?? 0),
    }))
    setConversations(next)
    const targetId = selectId ?? selected?.id
    if (targetId) setSelected(next.find((item) => item.id === targetId) ?? null)
    setLoading(false)
  }, [selected?.id])

  useEffect(() => {
    void loadConversations()
    const channel = supabase
      .channel('conversation-list-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => void loadConversations())
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadConversations])

  if (!user || !profile) return null

  const handleCreated = async (conversationId: string) => {
    setNewChatOpen(false)
    await loadConversations(conversationId)
  }

  return (
    <main className={`app-shell ${selected ? 'app-shell--chat-open' : ''}`}>
      <ConversationList
        profile={profile}
        conversations={conversations}
        selectedId={selected?.id ?? null}
        loading={loading}
        search={search}
        onSearch={setSearch}
        onSelect={setSelected}
        onNewChat={() => setNewChatOpen(true)}
        onProfile={() => setProfileOpen(true)}
      />

      {selected ? (
        <ChatView
          key={selected.id}
          conversation={selected}
          currentUser={profile}
          onBack={() => setSelected(null)}
          onMessageSent={() => void loadConversations(selected.id)}
        />
      ) : (
        <WelcomePanel onNewChat={() => setNewChatOpen(true)} />
      )}

      {newChatOpen ? (
        <NewChatModal currentUserId={user.id} onClose={() => setNewChatOpen(false)} onCreated={(id) => void handleCreated(id)} />
      ) : null}

      {profileOpen ? (
        <ProfileModal
          profile={profile}
          onClose={() => setProfileOpen(false)}
          onSaved={refreshProfile}
          onSignOut={async () => {
            setProfileOpen(false)
            await signOut()
          }}
        />
      ) : null}
    </main>
  )
}
