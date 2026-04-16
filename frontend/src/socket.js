import { io } from 'socket.io-client'

// Singleton — imported and shared across the entire app
const socket = io('http://localhost:5000', {
  autoConnect: true,
  transports: ['websocket', 'polling'],
})

export default socket
