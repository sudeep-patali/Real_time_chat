/**
 * Bootstraps global state on first login:
 * - loads pending group invitations into groupInviteStore
 * Called once from ProtectedRoute or the main layout.
 */
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useGroupInviteStore } from '../store/groupInviteStore'
import * as groupService from '../services/groupService'

export function useBootstrap() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const setInvitations  = useGroupInviteStore(state => state.setInvitations)

  useEffect(() => {
    if (!isAuthenticated) return
    groupService.getPendingInvitations()
      .then(res => setInvitations(res.data.invitations || []))
      .catch(() => {})
  }, [isAuthenticated])
}