import { useEffect, useState } from 'react'
import { BottomNavigation } from './BottomNavigation'
import { useAuth } from '../context/AuthContext'
import {
  createDirectConversation,
  getProfile,
  subscribeMyConversations,
} from '../lib/firebaseChat'
import type { ConversationSummary, NavigationSection } from '../types'
import { ConversationList } from './ConversationList'
import { ChatView } from './ChatView'
import { NewChatModal } from './NewChatModal'
import { ProfileModal } from './ProfileModal'
import { GroupRoomsPage } from './GroupRoomsPage'
import { AccountPage } from './AccountPage'
import { RoomInfoPage } from './RoomInfoPage'

export function ChatShell() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selected, setSelected] = useState<ConversationSummary | null>(null)
  const [roomInfo, setRoomInfo] = useState<ConversationSummary | null>(null)
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null)
  const [section, setSection] = useState<NavigationSection>('chats')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true
    let unsubscribe: (() => void) | null = null
    setLoading(true)

    void subscribeMyConversations(
      user.id,
      (next) => {
        if (!active) return
        setConversations(next)
        setSelected((current) => {
          const targetId = pendingSelectionId ?? current?.id
          if (!targetId) return current
          return next.find((item) => item.id === targetId) ?? current
        })
        if (pendingSelectionId && next.some((item) => item.id === pendingSelectionId)) {
          setPendingSelectionId(null)
        }
        setLoading(false)
      },
      (error) => {
        console.error('No fue posible cargar las conversaciones:', error)
        if (active) setLoading(false)
      },
    ).then((stop) => {
      if (!active) stop()
      else unsubscribe = stop
    }).catch((error) => {
      console.error('No fue posible conectar con Firestore:', error)
      if (active) setLoading(false)
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [user?.id, pendingSelectionId])

  if (!user || !profile) return null

  // ConversationList originalmente oculta las salas grupales y por eso mostraba
  // "Aún no hay conversaciones" aunque la sala sí existiera. Para conservar
  // el diseño de tres columnas, adaptamos solo la representación del panel lateral.
  const sidebarConversations: ConversationSummary[] = conversations.map((item) => (
    item.type === 'group'
      ? {
          ...item,
          type: 'direct',
          other_user_id: null,
          other_user_name: item.title ?? 'Sala',
          other_user_username: 'sala',
          other_user_avatar: item.avatar_url,
        }
      : item
  ))

  const selectFromSidebar = (item: ConversationSummary) => {
    setSelected(conversations.find((conversation) => conversation.id === item.id) ?? item)
    setPendingSelectionId(null)
  }

  const selectConversation = (conversationId: string) => {
    const existing = conversations.find((item) => item.id === conversationId)
    if (existing) {
      setSelected(existing)
      setPendingSelectionId(null)
    } else {
      setPendingSelectionId(conversationId)
    }
  }

  const handleCreated = (conversationId: string) => {
    setNewChatOpen(false)
    setSection('chats')
    selectConversation(conversationId)
  }

  const navigate = (next: NavigationSection) => {
    setRoomInfo(null)
    setSelected(null)
    setPendingSelectionId(null)
    setSection(next)
  }

  const openGroupRoom = async (roomId: string) => {
    setRoomInfo(null)
    setSection('chats')
    selectConversation(roomId)
  }

  const contactRoomCreator = async (creatorId: string) => {
    const creatorProfile = await getProfile(creatorId)
    const conversationId = await createDirectConversation(profile, creatorProfile)
    setRoomInfo(null)
    setSection('chats')
    selectConversation(conversationId)
  }

  if (roomInfo) {
    return (
      <main className="app-shell app-shell--section-open">
        <RoomInfoPage
          conversation={roomInfo}
          currentUser={profile}
          onBackToChat={() => setRoomInfo(null)}
          onNavigate={navigate}
          onContactCreator={contactRoomCreator}
        />
      </main>
    )
  }

  if (selected) {
    return (
      <main className="app-shell app-shell--chat-open">
        <ConversationList
          profile={profile}
          conversations={sidebarConversations}
          selectedId={selected.id}
          loading={loading}
          search={search}
          onSearch={setSearch}
          onSelect={selectFromSidebar}
          onNewChat={() => setNewChatOpen(true)}
          onProfile={() => setProfileOpen(true)}
          onNavigate={navigate}
        />

        <ChatView
        key={selected.id}
        conversation={selected}
        currentUser={profile}
         onBack={() => navigate('chats')}
         onMessageSent={() => undefined}
        onInfo={selected.type === 'group' ? () => setRoomInfo(selected) : undefined}
          />

<BottomNavigation
  active="chats"
  onNavigate={navigate}
/>

        {newChatOpen ? (
          <NewChatModal currentUser={profile} onClose={() => setNewChatOpen(false)} onCreated={handleCreated} />
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

  if (section === 'chats' || section === 'groups' || section === 'study') {
    return (
      <main className="app-shell app-shell--section-open">
        <GroupRoomsPage
          profile={profile}
          email={user.email ?? `@${profile.username}`}
          mode={section}
          onNavigate={navigate}
          onOpenRoom={openGroupRoom}
          onSignOut={signOut}
        />
      </main>
    )
  }

  if (section === 'profile') {
    return (
      <main className="app-shell app-shell--section-open">
        <AccountPage user={user} profile={profile} onNavigate={navigate} onSignOut={signOut} />
      </main>
    )
  }

  return null
}