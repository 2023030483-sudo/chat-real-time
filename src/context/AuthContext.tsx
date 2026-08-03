import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getProfile,
  signOutFirebase,
  subscribeAuth,
} from '../lib/firebaseChat'
import type { AuthUser, Profile } from '../types'

type AuthContextValue = {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (targetUser?: AuthUser | null) => {
    const current = targetUser ?? user
    if (!current) {
      setProfile(null)
      return
    }
    const nextProfile = await getProfile(current.id, current.email)
    setProfile(nextProfile)
  }

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | null = null

    void subscribeAuth(
      (nextUser) => {
        if (!active) return
        setUser(nextUser)
        if (nextUser) {
          void loadProfile(nextUser)
            .catch((error) => console.error('No fue posible cargar el perfil:', error))
            .finally(() => active && setLoading(false))
        } else {
          setProfile(null)
          setLoading(false)
        }
      },
      (error) => {
        console.error('No fue posible iniciar Firebase Auth:', error)
        if (active) setLoading(false)
      },
    ).then((stop) => {
      if (!active) stop()
      else unsubscribe = stop
    }).catch((error) => {
      console.error('No fue posible conectar con Firebase:', error)
      if (active) setLoading(false)
    })

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      refreshProfile: () => loadProfile(),
      signOut: signOutFirebase,
    }),
    [user, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  return context
}
