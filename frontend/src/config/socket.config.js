export const SERVER_URL = 'http://localhost:5000'

export const socketOptions = {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  timeout: 10000,
  autoConnect: false,
}