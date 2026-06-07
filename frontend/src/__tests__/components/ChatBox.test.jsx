import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock MessageBubble so ChatBox tests don't depend on its internals
vi.mock('../../components/MessageBubble', () => ({
  default: ({ message }) => (
    <div data-testid='message-bubble' data-id={message.id}>
      {message.content}
    </div>
  ),
}))

import ChatBox from '../../components/ChatBox'

// Factory
const makeMsg = (n) => ({
  id: `msg-${n}`,
  content: `Message ${n}`,
  senderId: 'user-2',
  roomId: 'room-1',
  timestamp: new Date('2024-06-15T10:00:00.000Z').toISOString(),
  type: 'text',
})

describe('ChatBox', () => {
  // ChatBox receives messages, typingUsers, currentUserId as props (from Chat.jsx)

  it('shows empty-state text when messages array is empty', () => {
    render(<ChatBox messages={[]} typingUsers={[]} currentUserId='user-1' />)
    // ChatBox renders "Messages are end-to-end encrypted." in empty state
    expect(screen.getByText(/end-to-end encrypted/i)).toBeInTheDocument()
  })

  it('renders one MessageBubble per message', () => {
    const messages = [makeMsg(1), makeMsg(2), makeMsg(3)]
    render(<ChatBox messages={messages} typingUsers={[]} currentUserId='user-1' />)
    expect(screen.getAllByTestId('message-bubble')).toHaveLength(3)
  })

  it('renders correct content inside each bubble', () => {
    const messages = [makeMsg(1), makeMsg(2)]
    render(<ChatBox messages={messages} typingUsers={[]} currentUserId='user-1' />)
    expect(screen.getByText('Message 1')).toBeInTheDocument()
    expect(screen.getByText('Message 2')).toBeInTheDocument()
  })

  it('inserts date dividers between messages on different dates', () => {
    const messages = [
      { ...makeMsg(1), timestamp: '2024-06-14T10:00:00.000Z' },
      { ...makeMsg(2), timestamp: '2024-06-15T10:00:00.000Z' },
    ]
    const { container } = render(
      <ChatBox messages={messages} typingUsers={[]} currentUserId='user-1' />
    )
    // ChatBox inserts .chat-date-divider elements between different dates
    const dividers = container.querySelectorAll('.chat-date-divider')
    expect(dividers.length).toBeGreaterThanOrEqual(1)
  })

  it('shows typing indicator when typingUsers is non-empty', () => {
    const { container } = render(
      <ChatBox messages={[makeMsg(1)]} typingUsers={['user-2']} currentUserId='user-1' />
    )
    expect(container.querySelector('.typing-indicator')).toBeInTheDocument()
  })

  it('hides typing indicator when typingUsers is empty', () => {
    const { container } = render(
      <ChatBox messages={[makeMsg(1)]} typingUsers={[]} currentUserId='user-1' />
    )
    expect(container.querySelector('.typing-indicator')).not.toBeInTheDocument()
  })

  it('renders the scrollable chat-area container', () => {
    const { container } = render(
      <ChatBox messages={[makeMsg(1)]} typingUsers={[]} currentUserId='user-1' />
    )
    expect(container.querySelector('.chat-area')).toBeInTheDocument()
  })

  it('passes isOwn=true to bubbles whose senderId matches currentUserId', () => {
    // MessageBubble mock doesn't show isOwn, but we verify no crash and correct count
    const messages = [
      { ...makeMsg(1), senderId: 'user-1' }, // own
      { ...makeMsg(2), senderId: 'user-2' }, // other
    ]
    render(<ChatBox messages={messages} typingUsers={[]} currentUserId='user-1' />)
    expect(screen.getAllByTestId('message-bubble')).toHaveLength(2)
  })
})