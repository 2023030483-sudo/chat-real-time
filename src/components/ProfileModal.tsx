import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, LogOut, X } from 'lucide-react'
import { updateProfile, uploadAvatar } from '../lib/firebaseChat'
import type { Profile } from '../types'
import { Avatar } from './Avatar'

type Props = {
  profile: Profile
  onClose: () => void
  onSaved: () => Promise<void>
  onSignOut: () => Promise<void>
}

export function ProfileModal({ profile, onClose, onSaved, onSignOut }: Props) {
  const [fullName, setFullName] = useState(profile.full_name)
  const [status, setStatus] = useState(profile.status ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const uploadAvatarImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe pesar menos de 5 MB.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const avatarUrl = await uploadAvatar(profile.id, file)
      await updateProfile(profile.id, { avatar_url: avatarUrl })
      await onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible subir la imagen.')
    } finally {
      setBusy(false)
    }
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await updateProfile(profile.id, {
        full_name: fullName.trim(),
        status: status.trim() || null,
      })
      await onSaved()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible guardar el perfil.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal-card modal-card--profile" role="dialog" aria-modal="true" aria-labelledby="profile-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2 id="profile-title">Mi perfil</h2>
            <p>Personaliza cómo te ven los demás.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </header>

        <div className="profile-photo-editor">
          <Avatar profile={profile} size="xl" />
          <label className="camera-button" title="Cambiar foto">
            <Camera size={18} />
            <input type="file" accept="image/*" onChange={(event) => void uploadAvatarImage(event)} hidden />
          </label>
        </div>
        <p className="profile-username">@{profile.username}</p>

        <form className="profile-form" onSubmit={save}>
          <label>
            Nombre completo
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>
          <label>
            Estado
            <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Disponible" maxLength={80} />
          </label>
          {error && <div className="form-message form-message--error">{error}</div>}
          <button className="primary-button" disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar cambios'}</button>
          <button className="danger-button" type="button" onClick={() => void onSignOut()}>
            <LogOut size={18} /> Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  )
}
