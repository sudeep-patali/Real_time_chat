import { io } from 'socket.io-client'
import { SERVER_URL, socketOptions } from '../config/socket.config'

export const socket = io(SERVER_URL, {
  ...socketOptions,
  autoConnect: false,
})