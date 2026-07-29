import type { Profile } from '../types'

type AvatarProps = {
  profile?: Partial<Profile> | null
  src?: string | null
  label?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Avatar({ profile, src, label, size = 'md' }: AvatarProps) {
  const name = label ?? profile?.full_name ?? profile?.username ?? 'Usuario'
  const image = src ?? profile?.avatar_url
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U'

  return (
    <div className={`avatar avatar--${size}`} aria-label={name}>
      {image ? <img src={image} alt={name} /> : <span>{initials}</span>}
    </div>
  )
}
