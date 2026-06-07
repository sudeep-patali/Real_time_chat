import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import MessageBubble from '../../components/MessageBubble'

// Mock utilities that MessageBubble imports
vi.mock('../../utils/generateAvatar', () => ({
  generateAvatar: () => 'data:image/png;base64,fake',
}))
vi.mock('../../utils/sanitizeMessage', () => ({
  sanitizeMessage: (msg) => msg,
}))
vi.mock('../../utils/formatTime', () => ({
  formatTime: () => '3:42 PM',
}))

// Helpers
const textMsg = (overrides = {}) => ({
  id: 'msg-1',
  content: 'Hello world',
  senderId: 'user-2',
  senderName: 'Alice',
  roomId: 'room-1',
  timestamp: new Date().toISOString(),
  type: 'text',
  isRead: false,
  ...overrides,
})

describe('MessageBubble', () => {
  // ── Alignment ──────────────────────────────────────────────
  it('applies "own" class to wrapper when isOwn=true', () => {
    const { container } = render(<MessageBubble message={textMsg()} isOwn={true} />)
    expect(container.querySelector('.bubble-wrapper.own')).toBeInTheDocument()
  })

  it('applies "other" class to wrapper when isOwn=false', () => {
    const { container } = render(<MessageBubble message={textMsg()} isOwn={false} />)
    expect(container.querySelector('.bubble-wrapper.other')).toBeInTheDocument()
  })

  it('applies "own" class to the bubble div when isOwn=true', () => {
    const { container } = render(<MessageBubble message={textMsg()} isOwn={true} />)
    expect(container.querySelector('.bubble.own')).toBeInTheDocument()
  })

  it('applies "other" class to the bubble div when isOwn=false', () => {
    const { container } = render(<MessageBubble message={textMsg()} isOwn={false} />)
    expect(container.querySelector('.bubble.other')).toBeInTheDocument()
  })

  // ── Avatar ─────────────────────────────────────────────────
  it('shows avatar image when isOwn=false', () => {
    const { container } = render(<MessageBubble message={textMsg()} isOwn={false} />)
    expect(container.querySelector('.bubble-avatar')).toBeInTheDocument()
  })

  it('does not show avatar image when isOwn=true', () => {
    const { container } = render(<MessageBubble message={textMsg()} isOwn={true} />)
    expect(container.querySelector('.bubble-avatar')).not.toBeInTheDocument()
  })

  // ── Sender name ────────────────────────────────────────────
  it('shows sender name for other messages', () => {
    render(<MessageBubble message={textMsg({ senderName: 'Alice' })} isOwn={false} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('does not show sender name for own messages', () => {
    render(<MessageBubble message={textMsg({ senderName: 'Alice' })} isOwn={true} />)
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  // ── Content types ──────────────────────────────────────────
  it('renders text content for type=text', () => {
    render(<MessageBubble message={textMsg({ content: 'Hello world' })} isOwn={false} />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders an img element for type=image', () => {
    const msg = textMsg({ type: 'image', fileUrl: 'https://cdn.example.com/img.jpg', content: '' })
    const { container } = render(<MessageBubble message={msg} isOwn={false} />)
    const img = container.querySelector('img.bubble-image')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/img.jpg')
  })

  it('renders a download link for type=file', () => {
    const msg = textMsg({ type: 'file', fileUrl: 'https://cdn.example.com/doc.pdf', content: 'doc.pdf' })
    const { container } = render(<MessageBubble message={msg} isOwn={false} />)
    const link = container.querySelector('a.bubble-file-link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://cdn.example.com/doc.pdf')
    expect(link).toHaveAttribute('download')
  })

  // ── Timestamp ──────────────────────────────────────────────
  it('renders the formatted timestamp', () => {
    render(<MessageBubble message={textMsg()} isOwn={false} />)
    expect(screen.getByText('3:42 PM')).toBeInTheDocument()
  })

  // ── Read receipt ───────────────────────────────────────────
  it('shows read tick for own message when isRead=true', () => {
    const { container } = render(
      <MessageBubble message={textMsg({ isRead: true })} isOwn={true} />
    )
    expect(container.querySelector('.bubble-tick.read')).toBeInTheDocument()
  })

  it('shows unread tick for own message when isRead=false', () => {
    const { container } = render(
      <MessageBubble message={textMsg({ isRead: false })} isOwn={true} />
    )
    const tick = container.querySelector('.bubble-tick')
    expect(tick).toBeInTheDocument()
    expect(tick).not.toHaveClass('read')
  })
})