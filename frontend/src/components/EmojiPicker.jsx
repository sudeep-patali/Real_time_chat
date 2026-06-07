import { useState, useMemo } from 'react'
import '../styles/chat.css'

// Emoji dataset — categorized
const EMOJI_CATEGORIES = [
  {
    label: '😀 Smileys',
    icon: '😀',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇',
      '🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝',
      '🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄',
      '😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧',
      '🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟',
      '🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭',
      '😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈',
      '👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖',
    ]
  },
  {
    label: '👋 People',
    icon: '👋',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙',
      '👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏',
      '🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶',
      '👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄',
      '💋','🩸','👶','🧒','👦','👧','🧑','👱','👨','🧔','🪱','👩',
      '👴','👵','🧓','👲','👳','🧕','🤶','🎅','👼','🤰','🤱',
    ]
  },
  {
    label: '🐶 Animals',
    icon: '🐶',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷',
      '🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦅','🦆','🦉','🦇',
      '🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🦟','🦗',
      '🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠',
      '🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛',
      '🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑',
    ]
  },
  {
    label: '🍎 Food',
    icon: '🍎',
    emojis: [
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭',
      '🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🧄','🧅',
      '🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇',
      '🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮',
      '🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟',
      '🦪','🍤','🍙','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬',
      '🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🧉',
    ]
  },
  {
    label: '⚽ Activities',
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒',
      '🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽',
      '🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️',
      '🤺','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈',
      '🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬',
      '🎤','🎧','🎼','🎵','🎶','🎹','🥁','🪘','🎷','🎺','🎸','🪕','🎻',
    ]
  },
  {
    label: '🚗 Travel',
    icon: '🚗',
    emojis: [
      '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛',
      '🚜','🏍️','🛵','🚲','🛴','🛹','🛼','🚏','🛣️','🛤️','🛞','⛽','🚨',
      '🚥','🚦','🛑','🚧','⚓','🪝','⛵','🛶','🚤','🛥️','🛳️','⛴️','🚢',
      '✈️','🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰️','🚀','🛸',
      '🪐','🌠','🌌','🌃','🌉','🌁','🌄','🌅','🌆','🌇','🌈','🌊','🌋',
      '⛰️','🏔️','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🏗️','🧱',
    ]
  },
  {
    label: '💡 Objects',
    icon: '💡',
    emojis: [
      '💡','🔦','🕯️','🪔','💰','💴','💵','💶','💷','💸','💳','🪙','💹',
      '📧','📨','📩','📪','📫','📬','📭','📮','🗳️','✏️','✒️','🖊️','🖋️',
      '📝','📁','📂','🗂️','📅','📆','🗒️','🗓️','📇','📈','📉','📊','📋',
      '📌','📍','🗺️','🗾','📏','📐','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔏',
      '🔐','🔑','🗝️','🔨','🪓','⛏️','⚒️','🛠️','🗡️','⚔️','🛡️','🪚','🔧',
      '🪛','🔩','⚙️','🗜️','⚖️','🦯','🔗','⛓️','🪝','🧲','🪜','🧰','🪤',
    ]
  },
  {
    label: '❤️ Symbols',
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹',
      '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️',
      '☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌',
      '♍','♎','♏','♐','♑','♒','♓','🆔','⚕️','♻️','⚜️','🔱','📛',
      '🔰','⭕','✅','☑️','✔️','❌','❎','〽️','✳️','✴️','❇️','💠',
      '🆚','💯','🔅','🔆','📶','📳','📴','📵','📞','🔇','🔈','🔉','🔊',
      '📢','📣','🔔','🔕','🎵','🎶','⁉️','🔜','🔛','🔝','🔙','🔚','🔀',
    ]
  },
]

const RECENT_KEY = 'emoji_recent'
const RECENT_MAX = 24

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch { return [] }
}

function saveRecent(emoji) {
  const prev = getRecent()
  const next = [emoji, ...prev.filter(e => e !== emoji)].slice(0, RECENT_MAX)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* noop */ }
}

function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0)
  const [search,         setSearch]         = useState('')
  const recent = getRecent()

  const allCategories = useMemo(() => {
    const cats = []
    if (recent.length) {
      cats.push({ label: '🕒 Recent', icon: '🕒', emojis: recent })
    }
    cats.push(...EMOJI_CATEGORIES)
    return cats
  }, [recent.length])

  const filtered = useMemo(() => {
    if (!search.trim()) return null
    const q = search.trim().toLowerCase()
    // Flatten all emojis and filter by rough keyword (emoji codepoint contains the character)
    return EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(e =>
      // Simple filter — return all if query matches emoji rendering
      e.includes(q) || e.toLowerCase().includes(q)
    ).slice(0, 60)
  }, [search])

  const handleSelect = (emoji) => {
    saveRecent(emoji)
    onSelect(emoji)
  }

  const displayEmojis = filtered || allCategories[activeCategory]?.emojis || []

  return (
    <div style={st.picker}>
      {/* Search */}
      <div style={st.searchRow}>
        <input
          style={st.searchInput}
          type='text'
          placeholder='Search emoji…'
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <button style={st.closeBtn} onClick={onClose} title='Close'>✕</button>
      </div>

      {/* Category tabs */}
      {!filtered && (
        <div style={st.tabs}>
          {allCategories.map((cat, i) => (
            <button
              key={cat.label}
              style={{
                ...st.tab,
                ...(activeCategory === i ? st.tabActive : {})
              }}
              onClick={() => setActiveCategory(i)}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Category label */}
      {!filtered && (
        <div style={st.categoryLabel}>
          {allCategories[activeCategory]?.label}
        </div>
      )}

      {/* Emoji grid */}
      <div style={st.grid}>
        {displayEmojis.length === 0 && (
          <span style={st.noResult}>No emoji found</span>
        )}
        {displayEmojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            style={st.emojiBtn}
            onClick={() => handleSelect(emoji)}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

const st = {
  picker: {
    width: 320,
    maxHeight: 380,
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 14,
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 10px 6px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    color: 'var(--color-text)',
    outline: 'none',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: 14,
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: 6,
    flexShrink: 0,
  },
  tabs: {
    display: 'flex',
    gap: 0,
    padding: '4px 6px',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  tab: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    padding: '4px 6px',
    borderRadius: 6,
    cursor: 'pointer',
    opacity: 0.6,
    transition: 'opacity 0.12s, background 0.12s',
    flexShrink: 0,
  },
  tabActive: {
    opacity: 1,
    background: 'var(--color-surface-2)',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    padding: '5px 10px 2px',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    padding: '4px 6px 8px',
    overflowY: 'auto',
    flex: 1,
    gap: 1,
  },
  emojiBtn: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: 6,
    transition: 'background 0.1s',
    flexShrink: 0,
  },
  noResult: {
    color: 'var(--color-text-dim)',
    fontSize: 13,
    padding: '16px',
    width: '100%',
    textAlign: 'center',
  },
}

export default EmojiPicker