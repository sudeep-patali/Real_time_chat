import { createContext, useContext, useEffect } from 'react'
import { socket } from '../socket/socket'
import { useAuthStore } from '../store/authStore'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) {
      socket.connect()
    } else {
      socket.disconnect()
    }

    return () => {
      socket.disconnect()
    }
  }, [isAuthenticated])

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