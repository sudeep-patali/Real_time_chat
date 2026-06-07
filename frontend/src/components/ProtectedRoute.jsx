import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useBootstrap } from '../hooks/useBootstrap'
import { useGlobalSocket } from '../hooks/useGlobalSocket'

function ProtectedRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  useBootstrap()      // load pending group invitations etc. on every protected mount
  useGlobalSocket()   // register all socket listeners once, at the top level
  return isAuthenticated ? <Outlet /> : <Navigate to='/login' replace />
}

export default ProtectedRoute