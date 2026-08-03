import { AuthPage } from './components/AuthPage'
import { ChatShell } from './components/ChatShell'
import { LoadingScreen } from './components/LoadingScreen'
import { useAuth } from './context/AuthContext'

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user ? <ChatShell /> : <AuthPage />
}
