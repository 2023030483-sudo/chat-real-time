import { AuthPage } from './components/AuthPage'
import { ChatShell } from './components/ChatShell'
import { LoadingScreen } from './components/LoadingScreen'
import { useAuth } from './context/AuthContext'

export default function App() {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return session ? <ChatShell /> : <AuthPage />
}
