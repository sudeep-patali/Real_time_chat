import { createContext, useContext, useEffect } from 'react'
import { socket } from '../socket/socket'
import { useAuthStore } from '../store/authStore'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const token = useAuthStore((state) => state.token)

  useEffect(() => {
    if (isAuthenticated && token) {
      // Pass JWT token in socket handshake
      socket.auth = { token }
      socket.connect()

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id)
      })

      socket.on('connect_error', (err) => {
        console.warn('Socket connection error:', err.message)
      })

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason)
      })
    } else {
      socket.disconnect()
    }

    return () => {
      socket.off('connect')
      socket.off('connect_error')
      socket.off('disconnect')
    }
  }, [isAuthenticated, token])

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocketContext() {
  return useContext(SocketContext)
}

export default SocketContext