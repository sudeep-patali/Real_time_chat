import { Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useBootstrap } from '../hooks/useBootstrap'
import { useGlobalSocket } from '../hooks/useGlobalSocket'

function ProtectedRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const currentUser = useAuthStore(state => state.currentUser)
  const loadSettings = useSettingsStore(state => state.loadSettings)
  
  useBootstrap()      // load pending group invitations etc. on every protected mount
  useGlobalSocket()   // register all socket listeners once, at the top level
  
  // Load settings on authentication (so Privacy page is pre-populated)
  useEffect(() => {
    if (currentUser && isAuthenticated) {
      loadSettings()
    }
  }, [currentUser, isAuthenticated, loadSettings])
  
  return isAuthenticated ? <Outlet /> : <Navigate to='/login' replace />
}

export default ProtectedRoute