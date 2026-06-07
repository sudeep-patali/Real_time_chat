import { useState, useRef, useEffect } from 'react'

const fmt = (secs) => {
  const s = Math.max(0, Math.round(isFinite(secs) ? secs : 0))
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const r = (s % 60).toString().padStart(2, '0')
  return `${m}:${r}`
}

/**
 * Custom audio player that correctly shows duration before playback.
 * Uses a real <audio> element (not new Audio()) so the browser can
 * stream range requests and report duration on loadedmetadata.
 */
function AudioPlayer({ src, totalDuration = 0, mimeType = '' }) {
  const [playing,     setPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(totalDuration || 0)
  const audioRef = useRef(null)

  // When src changes, reset state
  useEffect(() => {
    setPlaying(false)
    setCurrentTime(0)
    // Keep totalDuration hint until real duration loads
    setDuration(totalDuration || 0)
  }, [src])

  // Keep duration in sync if parent passes a better hint later
  useEffect(() => {
    if (totalDuration > 0 && (duration === 0 || !isFinite(duration))) {
      setDuration(totalDuration)
    }
  }, [totalDuration])

  const handleLoadedMetadata = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration)
    }
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (audio) setCurrentTime(audio.currentTime)
  }

  const handleEnded = () => {
    setPlaying(false)
    setCurrentTime(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      // Reload if audio errored (e.g. after crossOrigin retry)
      if (audio.error) {
        audio.load()
      }
      audio.play()
        .then(() => setPlaying(true))
        .catch((err) => {
          console.error('Audio play failed:', err.message, 'src:', audio.src)
        })
    }
  }

  const onScrub = (e) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const t = (Number(e.target.value) / 100) * duration
    audio.currentTime = t
    setCurrentTime(t)
  }

  const pct = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0
  const timeLabel = playing ? fmt(currentTime) : fmt(duration)

  return (
    <div style={styles.wrap}>
      {/* Real <audio> element — gives browser range-request support + correct duration */}
      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="anonymous"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={(e) => {
          const audio = e.currentTarget
          if (audio.crossOrigin === 'anonymous') {
            audio.crossOrigin = null
            audio.load()
          }
        }}
        style={{ display: 'none' }}
      >
        {/* Provide codec hint so browser can decode webm/opus correctly */}
        <source src={src} type={mimeType || 'audio/webm;codecs=opus'} />
        <source src={src} type="audio/webm" />
        <source src={src} type="audio/ogg" />
      </audio>

      <button style={styles.btn} onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <input
        type='range'
        style={styles.scrubber}
        min={0} max={100} step={0.1}
        value={pct}
        onChange={onScrub}
      />
      <span style={styles.time}>{timeLabel}</span>
    </div>
  )
}

const styles = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  btn: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: 'currentColor',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
  },
  scrubber: {
    flex: 1,
    minWidth: 0,
    accentColor: 'var(--color-primary)',
    cursor: 'pointer',
    height: 4,
  },
  time: {
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
    color: 'currentColor',
    opacity: 0.75,
    flexShrink: 0,
    minWidth: 36,
    textAlign: 'right',
  },
}

function PlayIcon() {
  return (
    <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
      <path d='M8 5v14l11-7z'/>
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
      <path d='M6 19h4V5H6v14zm8-14v14h4V5h-4z'/>
    </svg>
  )
}

export default AudioPlayer