import { useState, useRef, useEffect } from 'react'

const fmt = (secs) => {
  const s = Math.max(0, Math.round(isFinite(secs) ? secs : 0))
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const r = (s % 60).toString().padStart(2, '0')
  return `${m}:${r}`
}

/**
 * Custom audio player.
 *
 * FIX: Remove crossOrigin="anonymous".
 * The /uploads route is public (no auth required). Adding crossOrigin="anonymous"
 * forces a CORS request with an Origin header. If the browser has any cached
 * non-CORS response for the same URL (e.g. from a previous fetch), it will
 * treat the cached opaque response as a CORS failure and refuse to play.
 * Since no credentials are needed to fetch audio files, removing this attribute
 * lets the browser fetch normally without CORS constraints, which is both
 * simpler and more reliable.
 *
 * FIX: Use src attribute directly on <audio> (not <source> children).
 * Direct src attribute + audio.load() reload path works correctly.
 * <source> children don't reliably re-resolve after attribute changes.
 *
 * FIX: Handle Infinity duration from streaming WebM.
 * Browsers report audio.duration = Infinity for WebM files that have no
 * duration header written (common with variable-bitrate MediaRecorder output).
 * When this happens we fall back to totalDuration (the integer second count
 * from the recorder timer). With audioBitsPerSecond set in MediaRecorder,
 * most browsers now write the header correctly, but the Infinity guard is
 * kept here as a safety net for older browsers and ogg fallback files.
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
      // FIX: Prefer the browser-decoded duration over the timer-based fallback.
      // audio.duration is a float (e.g. 3.84 s) while totalDuration is always a
      // whole-second integer from the setInterval counter. The browser value is
      // more accurate and makes the scrubber position correctly.
      setDuration(audio.duration)
    }
    // If audio.duration is Infinity (no duration header in the WebM), keep the
    // totalDuration fallback that was already set in state — do nothing here.
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
      {/*
        No crossOrigin attribute — audio files are public, no CORS auth needed.
        Direct src on <audio> for reliable loading and reload.
      */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={(e) => console.error('Audio error:', e.currentTarget.error?.message, 'src:', e.currentTarget.src)}
        style={{ display: 'none' }}
      />

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