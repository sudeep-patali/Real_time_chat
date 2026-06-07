import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../config/api.config'
import './VoiceMessageRecorder.css'
import AudioPlayer from './AudioPlayer'

const formatDuration = (secs) => {
  const s = Math.max(0, Math.round(secs))
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const r = (s % 60).toString().padStart(2, '0')
  return `${m}:${r}`
}

function VoiceMessageRecorder({ onSend, disabled = false, roomId = null }) {
  const [state,    setState]    = useState('idle')  // idle | recording | preview
  const [duration, setDuration] = useState(0)
  const [bars,     setBars]     = useState(Array(30).fill(3))
  const [audioUrl, setAudioUrl] = useState(null)
  const [blob,     setBlob]     = useState(null)
  const [sending,  setSending]  = useState(false)
  const [error,    setError]    = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const timerRef         = useRef(null)
  const animFrameRef     = useRef(null)
  const streamRef        = useRef(null)
  const audioCtxRef      = useRef(null)
  const durationRef      = useRef(0)
  // Guard against double-start (onClick fires after onPointerDown on same tap)
  const isStartingRef    = useRef(false)

  useEffect(() => () => {
    stopAll()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [])

  const stopAll = () => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }

  const startVisualiser = (analyser) => {
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(data)
      const slice = Math.floor(data.length / 30)
      const newBars = Array.from({ length: 30 }, (_, i) => {
        const val = data[i * slice] || 0
        return Math.max(3, Math.round((val / 255) * 36))
      })
      setBars(newBars)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }

  const startRecording = useCallback(async () => {
    // isStartingRef prevents the double-fire from onPointerDown + onClick
    if (disabled || isStartingRef.current) return
    isStartingRef.current = true

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // No forced sampleRate — let AudioContext use system default to avoid resampling
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx
      const source   = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg'

      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        const url       = URL.createObjectURL(audioBlob)
        setBlob(audioBlob)
        setAudioUrl(url)
        setDuration(durationRef.current)
        setState('preview')
        isStartingRef.current = false
      }

      // NO timeslice — collect all audio in one chunk on stop.
      // Passing timeslice=100 to MediaRecorder on Chrome/webm produces
      // misaligned cluster timestamps that make playback run at wrong speed.
      recorder.start()
      mediaRecorderRef.current = recorder

      durationRef.current = 0
      setState('recording')
      setDuration(0)
      setBars(Array(30).fill(3))

      timerRef.current = setInterval(() => {
        durationRef.current += 1
        setDuration(prev => prev + 1)
      }, 1000)

      startVisualiser(analyser)

    } catch (err) {
      console.error('Mic error:', err)
      isStartingRef.current = false
      setState('idle')
    }
  }, [disabled])

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const cancel = useCallback(() => {
    stopAll()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setBlob(null)
    durationRef.current = 0
    isStartingRef.current = false
    setDuration(0)
    setBars(Array(30).fill(3))
    setState('idle')
  }, [audioUrl])

  const sendVoice = useCallback(async () => {
    if (!blob || sending) return
    setSending(true)
    setError(null)
    try {
      const ext      = blob.type.includes('ogg') ? 'ogg' : 'webm'
      const file     = new File([blob], `voice_${Date.now()}.${ext}`, { type: blob.type })
      const formData = new FormData()
      formData.append('file', file)
      if (roomId) formData.append('roomId', roomId)

      const res  = await api.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const data = res.data
      if (data.url) {
        onSend(data.url, 'audio', data.url, file.name, blob.type, durationRef.current)
        cancel()
      } else {
        setError('Upload failed — no URL returned.')
      }
    } catch (err) {
      console.error('Voice upload error:', err)
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setSending(false)
    }
  }, [blob, sending, onSend, cancel, roomId])

  // Use onClick only — remove onPointerDown/Up hold logic entirely.
  // The hold pattern was causing startRecording() to fire twice per tap
  // (once from the holdTimer and once from onClick).
  const handleClick = () => {
    if (disabled) return
    if (state === 'idle') startRecording()
  }

  if (state === 'idle') {
    return (
      <button
        className={`vmr-mic-btn ${disabled ? 'vmr-mic-btn--disabled' : ''}`}
        title='Click to record voice message'
        onClick={handleClick}
        disabled={disabled}
        aria-label='Record voice message'
      >
        <MicIcon />
      </button>
    )
  }

  if (state === 'recording') {
    return (
      <div className='vmr-bar vmr-bar--recording'>
        <button className='vmr-cancel-btn' onClick={cancel} title='Cancel'>
          <TrashIcon />
        </button>
        <div className='vmr-waveform'>
          {bars.map((h, i) => (
            <span key={i} className='vmr-waveform-bar' style={{ height: h }} />
          ))}
        </div>
        <span className='vmr-timer'>{formatDuration(duration)}</span>
        <button className='vmr-stop-btn' onClick={stopRecording} title='Stop recording'>
          <StopIcon />
        </button>
      </div>
    )
  }

  if (state === 'preview') {
    return (
      <div className='vmr-bar vmr-bar--preview'>
        <button className='vmr-cancel-btn' onClick={cancel} title='Discard'>
          <TrashIcon />
        </button>
        <AudioPlayer src={audioUrl} totalDuration={duration} />
        <button
          className='vmr-send-btn'
          onClick={sendVoice}
          disabled={sending}
          title='Send voice message'
        >
          {sending ? <SpinnerIcon /> : <SendIcon />}
        </button>
        {error && (
          <span style={{ fontSize: 11, color: 'var(--color-error, #e74c3c)', position: 'absolute', bottom: 2, left: 56 }}>
            {error}
          </span>
        )}
      </div>
    )
  }

  return null
}

// ── Icons ──────────────────────────────────────────────────────────────────
function MicIcon() {
  return (
    <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor'>
      <path d='M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z'/>
    </svg>
  )
}
function StopIcon() {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
      <rect x='6' y='6' width='12' height='12' rx='2'/>
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width='17' height='17' viewBox='0 0 24 24' fill='currentColor'>
      <path d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'/>
    </svg>
  )
}
function SendIcon() {
  return (
    <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
      <path d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'/>
    </svg>
  )
}
function SpinnerIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'
      strokeLinecap='round' style={{ animation: 'vmr-spin 0.8s linear infinite' }}>
      <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83'/>
    </svg>
  )
}

export default VoiceMessageRecorder