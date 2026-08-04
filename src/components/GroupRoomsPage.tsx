import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  ClipboardList,
  GraduationCap,
  Hash,
  LogOut,
  Megaphone,
  MessageSquareText,
  Plus,
  Rocket,
  Search,
  UsersRound,
} from 'lucide-react'
import {
  createGroupConversation,
  ensureDefaultRooms,
  joinGroupRoom,
  subscribeGroupRooms,
} from '../lib/firebaseChat'
import type { GroupRoom, NavigationSection, Profile } from '../types'
import { Avatar } from './Avatar'
import { BottomNavigation } from './BottomNavigation'

type Props = {
  profile: Profile
  email: string
  mode: 'chats' | 'groups' | 'study'
  onNavigate: (section: NavigationSection) => void
  onOpenRoom: (roomId: string) => Promise<void>
  onSignOut: () => Promise<void>
}

type Filter = 'Todas' | 'Académicas' | 'Social' | 'Urgente'
type PageView = 'list' | 'create'

const filters: Filter[] = ['Todas', 'Académicas', 'Social', 'Urgente']

function formatRoomTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer'
  return date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
}

function roomIcon(room: GroupRoom) {
  const normalized = room.title.toLowerCase()
  if (normalized.includes('tarea')) return ClipboardList
  if (normalized.includes('proyecto')) return Rocket
  if (normalized.includes('aviso') || room.category === 'Urgente') return Megaphone
  return MessageSquareText
}

function roomTone(room: GroupRoom) {
  const normalized = room.title.toLowerCase()
  if (normalized.includes('tarea')) return 'mint'
  if (normalized.includes('proyecto')) return 'orange'
  if (normalized.includes('aviso') || room.category === 'Urgente') return 'red'
  return 'blue'
}

export function GroupRoomsPage({ profile, email, mode, onNavigate, onOpenRoom, onSignOut }: Props) {
  const [rooms, setRooms] = useState<GroupRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>(mode === 'study' ? 'Académicas' : 'Todas')
  const [view, setView] = useState<PageView>('list')
  const [openingId, setOpeningId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | null = null
    setFilter(mode === 'study' ? 'Académicas' : 'Todas')
    setView(mode === 'groups' ? 'create' : 'list')
    setLoading(true)
    setError('')

    void ensureDefaultRooms(profile)
      .then(() => subscribeGroupRooms(
        profile.id,
        (nextRooms) => {
          if (!active) return
          setRooms(nextRooms)
          setLoading(false)
        },
        (caught) => {
          if (!active) return
          setError(caught.message)
          setLoading(false)
        },
      ))
      .then((stop) => {
        if (!active) stop()
        else unsubscribe = stop
      })
      .catch((caught) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : 'No fue posible cargar las salas.')
        setLoading(false)
      })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [mode, profile.id])

  const visibleRooms = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rooms.filter((room) => {
      const matchesMode = mode !== 'study' || room.category === 'Académicas'
      const matchesFilter = filter === 'Todas' || room.category === filter
      const matchesSearch = !term || [room.title, room.description, room.last_message]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term))
      return matchesMode && matchesFilter && matchesSearch
    })
  }, [filter, mode, rooms, search])

  const openRoom = async (room: GroupRoom) => {
    if (openingId) return
    setOpeningId(room.id)
    setError('')

    if (!room.is_member) {
      try {
        await joinGroupRoom(room.id, profile)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'No fue posible unirte a la sala.')
        setOpeningId(null)
        return
      }
    }

    await onOpenRoom(room.id)
    setOpeningId(null)
  }

  if (mode === 'groups' || view === 'create') {
    return (
      <CreateRoomPage
        profile={profile}
        onCancel={() => {
          if (mode === 'groups') onNavigate('chats')
          else setView('list')
        }}
        onCreated={async () => {
          // La sala ya quedó guardada en Firestore. Regresamos a la lista
          // sin abrirla automáticamente, para conservar el menú inferior.
          setView('list')
          onNavigate('chats')
        }}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
      />
    )
  }

  return (
    <section className="section-page-shell">
      <div className="chat-aula-page rooms-page">
        <header className="rooms-account-header">
          <button className="rooms-account-identity" type="button" onClick={() => onNavigate('profile')}>
            <Avatar profile={profile} size="sm" />
            <span>
              <strong>{mode === 'study' ? 'Espacios de estudio' : 'Salas de chat'}</strong>
              <small>{email}</small>
            </span>
          </button>
          <button className="icon-button rooms-logout" type="button" onClick={() => void onSignOut()} aria-label="Cerrar sesión">
            <LogOut size={19} />
          </button>
        </header>

        <div className="rooms-page__body">
          <label className="rooms-search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar sala" />
          </label>

          {mode === 'chats' ? (
            <div className="room-filter-tabs" role="tablist" aria-label="Filtrar salas">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={filter === item ? 'active' : ''}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : (
            <div className="study-intro-card">
              <GraduationCap size={22} />
              <span>
                <strong>Estudia en equipo</strong>
                <small>Accede rápidamente a tus salas académicas.</small>
              </span>
            </div>
          )}

          {error ? <div className="form-message form-message--error rooms-error">{error}</div> : null}
          {loading ? <p className="muted-copy">Cargando salas…</p> : null}

          <div className="room-card-list">
            {!loading && visibleRooms.length === 0 ? (
              <div className="rooms-empty-state">
                <UsersRound size={28} />
                <strong>No encontramos salas</strong>
                <p>Prueba con otra búsqueda o crea una sala nueva.</p>
              </div>
            ) : null}

            {visibleRooms.map((room) => {
              const Icon = roomIcon(room)
              const tone = roomTone(room)
              return (
                <button
                  className={`room-card room-card--${tone}`}
                  type="button"
                  key={room.id}
                  onClick={() => void openRoom(room)}
                  disabled={openingId === room.id}
                >
                  <span className="room-card__stripe" />
                  <span className="room-card__icon"><Icon size={22} /></span>
                  <span className="room-card__copy">
                    <span className="room-card__topline">
                      <strong>{room.title}</strong>
                      <time>{formatRoomTime(room.last_message_at ?? room.updated_at)}</time>
                    </span>
                    <span className="room-card__bottomline">
                      <small>{openingId === room.id ? 'Abriendo sala…' : room.last_message || room.description || 'Sala lista para conversar'}</small>
                      {room.unread_count > 0 ? <b>{room.unread_count > 99 ? '99+' : room.unread_count}</b> : null}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {mode === 'chats' ? (
          <button className="rooms-floating-button" type="button" onClick={() => setView('create')} aria-label="Crear sala">
            <Plus size={27} />
          </button>
        ) : null}

        <BottomNavigation active={mode === 'study' ? 'study' : 'chats'} onNavigate={onNavigate} />
      </div>
    </section>
  )
}

type CreateRoomProps = {
  profile: Profile
  onCancel: () => void
  onCreated: (roomId: string) => Promise<void>
  onNavigate: (section: NavigationSection) => void
  onSignOut: () => Promise<void>
}

function CreateRoomPage({ profile, onCancel, onCreated, onNavigate, onSignOut }: CreateRoomProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const createRoom = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')

    try {
      const roomId = await createGroupConversation(
        profile,
        name.trim(),
        description.trim(),
        'Académicas',
      )
      await onCreated(roomId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible crear la sala.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="section-page-shell">
      <div className="chat-aula-page create-room-page">
        <header className="chat-aula-brand-header">
          <div className="chat-aula-brand">
            <GraduationCap size={22} />
            <strong>Chat Aula</strong>
          </div>
          <div className="chat-aula-header-actions">
            <button className="icon-button" type="button" onClick={() => void onSignOut()} aria-label="Cerrar sesión"><LogOut size={18} /></button>
            <Avatar profile={profile} size="sm" />
          </div>
        </header>

        <div className="create-room-page__body">
          <button className="inline-back-button" type="button" onClick={onCancel}><ArrowLeft size={14} /> Volver</button>
          <h1>Nueva sala</h1>
          <p className="create-room-subtitle">Las salas sirven para organizar conversaciones por tema</p>

          <form className="create-room-form" onSubmit={createRoom}>
            <div className="create-room-fields-card">
              <label>
                Nombre de la sala
                <span className="create-room-input">
                  <Hash size={20} />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ej: Álgebra Lineal - Grupo A"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </span>
              </label>

              <label>
                Descripción
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="¿De qué trata este espacio? Añade detalles para tus compañeros..."
                  maxLength={500}
                  rows={4}
                />
              </label>
            </div>

            <article className="room-benefit-card room-benefit-card--blue">
              <span><UsersRound size={22} /></span>
              <div><strong>Colaborativo</strong><p>Cualquier estudiante del aula podrá unirse.</p></div>
            </article>

            <article className="room-benefit-card room-benefit-card--mint">
              <span><BadgeCheck size={22} /></span>
              <div><strong>Organizado</strong><p>Categoriza tus hilos de estudio fácilmente.</p></div>
            </article>

            {error ? <div className="form-message form-message--error">{error}</div> : null}

            <button className="create-room-submit" type="submit" disabled={busy || !name.trim()}>
              <Plus size={17} /> {busy ? 'Creando sala…' : 'Crear sala'}
            </button>
            <button className="create-room-cancel" type="button" onClick={onCancel}>Cancelar</button>
          </form>
        </div>

        <BottomNavigation active="groups" onNavigate={onNavigate} />
      </div>
    </section>
  )
}