import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { Avatar } from './Avatar'

type Props = {
  currentUserId: string
  onClose: () => void
  onCreated: (conversationId: string) => void
}

export function NewChatModal({ currentUserId, onClose, onCreated }: Props) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      let query = supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, status')
        .neq('id', currentUserId)
        .order('full_name')
        .limit(20)

      if (term.trim()) {
        const clean = term.trim().replace(/[,%()]/g, '')
        query = query.or(`full_name.ilike.%${clean}%,username.ilike.%${clean}%`)
      }

      const { data, error: searchError } = await query
      if (searchError) setError(searchError.message)
      setResults((data ?? []) as Profile[])
      setLoading(false)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [term, currentUserId])

  const createConversation = async (profile: Profile) => {
    setLoading(true)
    setError('')
    const { data, error: createError } = await supabase.rpc('create_direct_conversation', {
      other_user_id: profile.id,
    })

    if (createError) {
      setError(createError.message)
      setLoading(false)
      return
    }

    onCreated(data as string)
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
          {loading && results.length === 0 ? <p className="muted-copy">Buscando…</p> : null}
          {!loading && results.length === 0 ? <p className="muted-copy">No se encontraron usuarios.</p> : null}
          {results.map((profile) => (
            <button className="person-row" key={profile.id} onClick={() => void createConversation(profile)} disabled={loading}>
              <Avatar profile={profile} />
              <span>
                <strong>{profile.full_name}</strong>
                <small>@{profile.username}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
