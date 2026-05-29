import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useEffect } from 'react'

function ProtectedRoute() {
  const { isAuthenticated, hydrate } = useAuthStore()

  useEffect(() => {
    hydrate()
  }, [])

  return isAuthenticated ? <Outlet /> : <Navigate to='/login' replace />
}

export default ProtectedRoute