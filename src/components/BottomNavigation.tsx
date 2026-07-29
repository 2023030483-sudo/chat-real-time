import { BookOpen, MessageSquareText, UserRound, UsersRound } from 'lucide-react'
import type { NavigationSection } from '../types'

type Props = {
  active: NavigationSection
  onNavigate: (section: NavigationSection) => void
}

const items: Array<{
  id: NavigationSection
  label: string
  icon: typeof MessageSquareText
}> = [
  { id: 'chats', label: 'Chats', icon: MessageSquareText },
  { id: 'groups', label: 'Groups', icon: UsersRound },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

export function BottomNavigation({ active, onNavigate }: Props) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación principal">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={active === id ? 'active' : ''}
          type="button"
          onClick={() => onNavigate(id)}
          aria-current={active === id ? 'page' : undefined}
        >
          <Icon size={19} strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}