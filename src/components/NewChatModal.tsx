import { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { createDirectConversation, subscribeProfiles } from '../lib/firebaseChat'
import type { Profile } from '../types'
import { Avatar } from './Avatar'

type Props = {
  currentUser: Profile
  onClose: () => void
  onCreated: (conversationId: string) => void
}

export function NewChatModal({ currentUser, onClose, onCreated }: Props) {
  const [term, setTerm] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creatingId, setCreatingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | null = null

    void subscribeProfiles(
      currentUser.id,
      (nextProfiles) => {
        if (!active) return
        setProfiles(nextProfiles)
        setLoading(false)
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
      setError(caught instanceof Error ? caught.message : 'No fue posible buscar usuarios.')
      setLoading(false)
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [currentUser.id])

  const results = useMemo(() => {
    const cleanTerm = term.trim().toLowerCase()
    if (!cleanTerm) return profiles
    return profiles.filter((profile) => (
      profile.full_name.toLowerCase().includes(cleanTerm)
      || profile.username.toLowerCase().includes(cleanTerm)
    ))
  }, [profiles, term])

  const createConversation = async (profile: Profile) => {
    setCreatingId(profile.id)
    setError('')
    try {
      const conversationId = await createDirectConversation(currentUser, profile)
      onCreated(conversationId)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible crear la conversación.')
      setCreatingId(null)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="new-chat-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2 id="new-chat-title">Nueva conversación</h2>
            <p>Busca a una persona registrada.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>

        <label className="search-box">
          <Search size={18} />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Nombre o usuario" autoFocus />
        </label>

        {error && <div className="form-message form-message--error">{error}</div>}

        <div className="people-list">
          {loading ? <p className="muted-copy">Buscando…</p> : null}
          {!loading && results.length === 0 ? <p className="muted-copy">No se encontraron usuarios.</p> : null}
          {results.map((profile) => (
            <button className="person-row" key={profile.id} onClick={() => void createConversation(profile)} disabled={creatingId !== null}>
              <Avatar profile={profile} />
              <span>
                <strong>{profile.full_name}</strong>
                <small>@{profile.username}</small>
              </span>
              {creatingId === profile.id ? <small>Abriendo…</small> : null}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
