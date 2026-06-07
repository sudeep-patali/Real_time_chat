export const SERVER_URL = 'http://localhost:5000'

export const socketOptions = {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000,
  autoConnect: false,
}