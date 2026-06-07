import { useContext } from 'react'
import SocketContext from '../context/SocketContext'

export function useSocket() {
  const socket = useContext(SocketContext)

  const emit = (eventName, data) => {
    if (!socket || !socket.connected) return
    socket.emit(eventName, data)
  }

  const on = (eventName, callback) => {
    if (!socket) return
    socket.on(eventName, callback)
  }

  const off = (eventName, callback) => {
    if (!socket) return
    socket.off(eventName, callback)
  }

  return { emit, on, off, socket }
}