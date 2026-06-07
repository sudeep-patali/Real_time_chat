import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Mock messageService ──────────────────────────────────────
vi.mock('../../services/messageService', () => ({
  fetchHistory: vi.fn(),
  sendMessage:  vi.fn(),
  markRead:     vi.fn(),
}))

// ── Mock socket event constants ──────────────────────────────
vi.mock('../../socket/socketEvents', () => ({
  RECEIVE_MESSAGE:  'receive_message',
  USER_TYPING:      'user_typing',
  USER_STOP_TYPING: 'user_stop_typing',
  USER_ONLINE:      'user_online',
  JOIN_ROOM:        'join_room',
  LEAVE_ROOM:       'leave_room',
  SEND_MESSAGE:     'send_message',
}))

// ── Capture socket listeners so we can fire them manually ────
const socketListeners = {}
const mockEmit = vi.fn()
const mockOn   = vi.fn((event, cb) => { socketListeners[event] = cb })
const mockOff  = vi.fn((event)     => { delete socketListeners[event] })

vi.mock('../../hooks/useSocket', () => ({
  useSocket: () => ({ emit: mockEmit, on: mockOn, off: mockOff }),
}))

// ── In-memory chatStore ──────────────────────────────────────
let _messages = []
let _rooms    = []
let _activeRoomId = 'room-1'

vi.mock('../../store/chatStore', () => ({
  useChatStore: (selector) => selector({
    messages:         _messages,
    rooms:            _rooms,
    activeRoomId:     _activeRoomId,
    typingUsers:      [],
    setMessages:      (msgs) => { _messages = msgs },
    addMessage:       (msg)  => { _messages = [..._messages, msg] },
    setRooms:         (r)    => { _rooms = r },
    setActiveRoom:    (id)   => { _activeRoomId = id },
    setTyping:        vi.fn(),
    updateUserOnline: vi.fn(),
  }),
}))

// ── In-memory notificationStore ──────────────────────────────
vi.mock('../../store/notificationStore', () => ({
  useNotificationStore: (selector) => selector({
    incrementUnread: vi.fn(),
    clearUnread:     vi.fn(),
  }),
}))

import * as messageService from '../../services/messageService'
import { useChat } from '../../hooks/useChat'

const makeMsg = (n, roomId = 'room-1') => ({
  id: `msg-${n}`,
  content: `Message ${n}`,
  senderId: 'user-2',
  roomId,
  timestamp: new Date().toISOString(),
  type: 'text',
})

beforeEach(() => {
  _messages     = []
  _rooms        = []
  _activeRoomId = 'room-1'
  vi.clearAllMocks()
  Object.keys(socketListeners).forEach(k => delete socketListeners[k])
})

describe('useChat', () => {
  it('calls fetchHistory on mount with the roomId', async () => {
    messageService.fetchHistory.mockResolvedValueOnce({ data: { messages: [] } })

    renderHook(() => useChat('room-1'))

    await waitFor(() => {
      expect(messageService.fetchHistory).toHaveBeenCalledWith('room-1')
    })
  })

  it('populates messages from fetchHistory response', async () => {
    const fakeMessages = [makeMsg(1), makeMsg(2)]
    messageService.fetchHistory.mockResolvedValueOnce({ data: { messages: fakeMessages } })

    renderHook(() => useChat('room-1'))

    await waitFor(() => {
      expect(_messages).toHaveLength(2)
    })
  })

  it('emits JOIN_ROOM socket event on mount', async () => {
    messageService.fetchHistory.mockResolvedValueOnce({ data: { messages: [] } })

    renderHook(() => useChat('room-1'))

    await waitFor(() => {
      expect(mockEmit).toHaveBeenCalledWith('join_room', { roomId: 'room-1' })
    })
  })

  it('registers RECEIVE_MESSAGE socket listener on mount', async () => {
    messageService.fetchHistory.mockResolvedValueOnce({ data: { messages: [] } })

    renderHook(() => useChat('room-1'))

    await waitFor(() => {
      expect(mockOn).toHaveBeenCalledWith('receive_message', expect.any(Function))
    })
  })

  it('adds incoming message to store when RECEIVE_MESSAGE fires', async () => {
    messageService.fetchHistory.mockResolvedValueOnce({ data: { messages: [] } })

    renderHook(() => useChat('room-1'))

    await waitFor(() => expect(mockOn).toHaveBeenCalled())

    act(() => {
      socketListeners['receive_message']?.({ message: makeMsg(42) })
    })

    await waitFor(() => {
      expect(_messages.some(m => m.id === 'msg-42')).toBe(true)
    })
  })

  it('sendMessage adds message optimistically to the store', async () => {
    messageService.fetchHistory.mockResolvedValueOnce({ data: { messages: [] } })
    messageService.sendMessage.mockResolvedValueOnce({ data: { message: makeMsg(99) } })

    const { result } = renderHook(() => useChat('room-1'))

    await waitFor(() => expect(messageService.fetchHistory).toHaveBeenCalled())

    await act(async () => {
      await result.current.sendMessage('Hello!')
    })

    // Optimistic message should appear immediately
    expect(_messages.length).toBeGreaterThanOrEqual(1)
    expect(_messages.some(m => m.content === 'Hello!')).toBe(true)
  })

  it('emits SEND_MESSAGE socket event when sendMessage is called', async () => {
    messageService.fetchHistory.mockResolvedValueOnce({ data: { messages: [] } })
    messageService.sendMessage.mockResolvedValueOnce({ data: {} })

    const { result } = renderHook(() => useChat('room-1'))

    await waitFor(() => expect(messageService.fetchHistory).toHaveBeenCalled())

    await act(async () => {
      await result.current.sendMessage('Hey')
    })

    expect(mockEmit).toHaveBeenCalledWith('send_message', expect.objectContaining({
      content: 'Hey',
      roomId: 'room-1',
    }))
  })

  it('removes socket listeners on unmount', async () => {
    messageService.fetchHistory.mockResolvedValueOnce({ data: { messages: [] } })

    const { unmount } = renderHook(() => useChat('room-1'))

    await waitFor(() => expect(mockOn).toHaveBeenCalled())

    unmount()

    expect(mockOff).toHaveBeenCalledWith('receive_message', expect.any(Function))
  })
})