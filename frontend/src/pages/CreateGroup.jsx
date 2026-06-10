import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useChatStore } from '../store/chatStore'
import { useMobileNav } from '../hooks/useMobileNav'
import { generateAvatar } from '../utils/generateAvatar'
import * as userService from '../services/userService'
import * as groupService from '../services/groupService'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import MobilePageHeader from '../components/MobilePageHeader'
import { ArrowLeft, Search, X, Camera, Users, Check, Sparkles, Hash } from 'lucide-react'
import '../styles/mobile-page.css'

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Styles injected once at module load — never re-injected on re-render ──────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  .cg-shell {
    display: flex; flex-direction: column;
    height: 100vh; overflow: hidden;
    background-color: var(--color-bg);
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .cg-body { display: flex; flex: 1; overflow: hidden; }
  .cg-main {
    flex: 1; overflow-y: auto;
    display: flex; justify-content: center; align-items: flex-start;
    padding: 28px 16px 48px;
    background: var(--color-surface-3);
    position: relative;
  }

  /* ── Mobile shell overrides ── */
  .cg-mobile-shell {
    display: flex; flex-direction: column;
    height: 100dvh; overflow: hidden;
    background-color: var(--color-bg);
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .cg-mobile-content {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    display: flex; justify-content: center; align-items: flex-start;
    padding-top: 16px; padding-left: 16px; padding-right: 16px;
    background: var(--color-surface-3);
    position: relative;
  }
  /* On mobile the card goes full-width with tighter padding */
  .cg-mobile-content .cg-card {
    max-width: 100%;
    padding: 20px 16px 32px;
    border-radius: 16px;
    margin-bottom: 24px;
  }

  /* Orbs */
  .cg-bg-orb {
    position: fixed; border-radius: 50%; pointer-events: none;
    z-index: 0; filter: blur(80px); opacity: 0.07;
    will-change: transform;
  }
  .cg-bg-orb--1 {
    width: 340px; height: 340px; background: var(--color-primary);
    top: 5%; right: 10%; animation: cg-float 8s ease-in-out infinite;
  }
  .cg-bg-orb--2 {
    width: 260px; height: 260px; background: #a78bfa;
    bottom: 15%; left: 8%; animation: cg-float 10s ease-in-out infinite reverse;
  }
  .cg-bg-orb--3 {
    width: 200px; height: 200px; background: #34d399;
    top: 50%; right: 5%; animation: cg-float 7s ease-in-out infinite 2s;
  }
  @keyframes cg-float {
    0%,100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-24px) scale(1.05); }
  }

  /* Card — NO overflow:hidden so results list is never clipped */
  .cg-card {
    width: 100%; max-width: 500px;
    background: var(--color-surface);
    border-radius: 24px; padding: 32px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.22), 0 0 0 1px var(--color-border);
    display: flex; flex-direction: column; gap: 0;
    height: fit-content; position: relative; z-index: 1;
  }
  .cg-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    border-radius: 24px 24px 0 0;
    background: linear-gradient(90deg, var(--color-primary), #a78bfa, #34d399, var(--color-primary));
    background-size: 200% auto;
    animation: cg-gradient-shift 3s linear infinite;
  }
  @keyframes cg-gradient-shift { to { background-position: 200% center; } }

  /* Header */
  .cg-header { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
  .cg-back-btn {
    background: var(--color-surface-2); border: 1px solid var(--color-border);
    color: var(--color-text-muted); cursor: pointer;
    width: 38px; height: 38px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: all 0.2s;
  }
  .cg-back-btn:hover {
    background: var(--color-primary-light); color: var(--color-primary);
    border-color: var(--color-primary); transform: translateX(-2px);
  }
  .cg-header-text { display: flex; flex-direction: column; gap: 2px; }
  .cg-title {
    font-size: 20px; font-weight: 800; color: var(--color-text);
    margin: 0; display: flex; align-items: center; gap: 8px;
  }
  .cg-title-icon { color: var(--color-primary); }
  .cg-subtitle { font-size: 12px; color: var(--color-text-dim); margin: 0; font-weight: 500; }

  /* Steps */
  .cg-steps { display: flex; align-items: center; margin-bottom: 28px; }
  .cg-step { display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; }
  .cg-step-num {
    width: 28px; height: 28px; border-radius: 50%;
    border: 2px solid var(--color-border); color: var(--color-text-dim);
    font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.3s; flex-shrink: 0;
  }
  .cg-step--active .cg-step-num {
    background: var(--color-primary); border-color: var(--color-primary);
    color: #fff; box-shadow: 0 0 0 4px var(--color-input-focus);
  }
  .cg-step-label { font-size: 12px; font-weight: 600; color: var(--color-text-dim); transition: color 0.2s; }
  .cg-step--active .cg-step-label { color: var(--color-text); }
  .cg-step-line { flex: 1; height: 2px; background: var(--color-border); margin: 0 8px; border-radius: 2px; }

  /* Step panel */
  .cg-step-panel { display: flex; flex-direction: column; gap: 20px; }
  .cg-fade-in { animation: cg-fade-up 0.3s ease both; }
  @keyframes cg-fade-up {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Avatar */
  .cg-hero-zone { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 12px 0; }
  .cg-avatar-ring {
    position: relative; width: 110px; height: 110px;
    border-radius: 50%; cursor: pointer; overflow: hidden;
    border: 3px solid var(--color-primary);
    box-shadow: 0 0 0 6px var(--color-input-focus);
    transition: box-shadow 0.2s;
  }
  .cg-avatar-ring:hover { box-shadow: 0 0 0 9px var(--color-input-focus); }
  .cg-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .cg-avatar-initials {
    width: 100%; height: 100%;
    background: linear-gradient(135deg, var(--color-primary) 0%, #a78bfa 100%);
    display: flex; align-items: center; justify-content: center;
    font-size: 36px; font-weight: 800; color: #fff;
  }
  .cg-avatar-overlay {
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4px; color: #fff; font-size: 11px; font-weight: 600;
    opacity: 0; transition: opacity 0.2s;
  }
  .cg-avatar-ring:hover .cg-avatar-overlay { opacity: 1; }
  .cg-avatar-hint { font-size: 12px; color: var(--color-text-dim); margin: 0; }

  /* Inputs */
  .cg-field-group { display: flex; flex-direction: column; gap: 4px; }
  .cg-floating-label {
    font-size: 11px; font-weight: 700; color: var(--color-text-muted);
    text-transform: uppercase; letter-spacing: 0.8px;
    display: flex; align-items: center; gap: 8px; margin-bottom: 6px;
  }
  .cg-optional-tag {
    background: var(--color-surface-2); border: 1px solid var(--color-border);
    color: var(--color-text-dim); font-size: 10px; font-weight: 500;
    padding: 1px 7px; border-radius: 20px; text-transform: none; letter-spacing: 0;
  }
  .cg-input-wrap {
    display: flex; align-items: center; gap: 10px;
    background: var(--color-surface-2); border: 1.5px solid var(--color-border);
    border-radius: 14px; padding: 4px 14px;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .cg-input-wrap:focus-within {
    border-color: var(--color-primary); background: var(--color-surface);
    box-shadow: 0 0 0 4px var(--color-input-focus);
  }
  .cg-field-icon { color: var(--color-text-dim); flex-shrink: 0; transition: color 0.2s; }
  .cg-input-wrap:focus-within .cg-field-icon { color: var(--color-primary); }
  .cg-input {
    flex: 1; background: none; border: none;
    color: var(--color-text); font-size: 15px; font-weight: 600;
    padding: 12px 0; outline: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .cg-input::placeholder { color: var(--color-text-dim); font-weight: 400; }
  .cg-char-pill {
    font-size: 11px; color: var(--color-text-dim);
    background: var(--color-surface); border: 1px solid var(--color-border);
    padding: 2px 8px; border-radius: 20px; flex-shrink: 0; white-space: nowrap;
  }
  .cg-input-bar {
    height: 2px; background: linear-gradient(90deg, var(--color-primary), #a78bfa);
    border-radius: 2px; transition: width 0.2s ease;
  }
  .cg-textarea {
    background: var(--color-surface-2); border: 1.5px solid var(--color-border);
    border-radius: 14px; color: var(--color-text);
    font-size: 14px; padding: 12px 14px; outline: none;
    width: 100%; box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', sans-serif;
    resize: none; line-height: 1.6;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .cg-textarea:focus {
    border-color: var(--color-primary); background: var(--color-surface);
    box-shadow: 0 0 0 4px var(--color-input-focus);
  }
  .cg-textarea::placeholder { color: var(--color-text-dim); }
  .cg-char-right { font-size: 11px; color: var(--color-text-dim); align-self: flex-end; }

  /* Next button */
  .cg-next-btn {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    padding: 14px 20px; background: var(--color-primary); color: #fff;
    border: none; border-radius: 14px; font-size: 15px; font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer;
    transition: filter 0.2s, transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 14px rgba(0,0,0,0.15);
  }
  .cg-next-btn:hover:not(:disabled) {
    filter: brightness(1.1); transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.2);
  }
  .cg-next-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Step 2 group preview */
  .cg-group-preview {
    display: flex; align-items: center; gap: 14px;
    background: var(--color-surface-2); border: 1px solid var(--color-border);
    border-radius: 16px; padding: 14px 16px;
  }
  .cg-preview-avatar { width: 46px; height: 46px; border-radius: 14px; object-fit: cover; flex-shrink: 0; }
  .cg-preview-initials {
    width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--color-primary) 0%, #a78bfa 100%);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 800; color: #fff;
  }
  .cg-preview-info { flex: 1; min-width: 0; }
  .cg-preview-name {
    display: block; font-size: 15px; font-weight: 700; color: var(--color-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cg-preview-desc {
    display: block; font-size: 12px; color: var(--color-text-dim);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;
  }
  .cg-member-badge {
    display: flex; align-items: center; gap: 5px;
    background: var(--color-primary-light); border: 1px solid var(--color-primary);
    color: var(--color-primary); border-radius: 20px; padding: 4px 10px;
    font-size: 12px; font-weight: 700; flex-shrink: 0;
  }

  /* Chips */
  .cg-chips-zone { display: flex; flex-direction: column; gap: 10px; }
  .cg-chips-header {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700; color: var(--color-text-muted);
    text-transform: uppercase; letter-spacing: 0.8px;
  }
  .cg-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .cg-chip {
    display: flex; align-items: center; gap: 7px;
    background: var(--color-primary-light); border: 1.5px solid var(--color-primary);
    border-radius: 20px; padding: 5px 10px 5px 6px;
    animation: cg-chip-pop 0.2s ease both;
  }
  @keyframes cg-chip-pop {
    from { transform: scale(0.75); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }
  .cg-chip-avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
  .cg-chip-name { font-size: 13px; color: var(--color-primary); font-weight: 600; }
  .cg-chip-x {
    background: var(--color-primary); border: none; color: #fff;
    width: 16px; height: 16px; border-radius: 50%; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    opacity: 0.7; transition: opacity 0.15s; padding: 0; flex-shrink: 0;
  }
  .cg-chip-x:hover { opacity: 1; }

  /* Search */
  .cg-search-wrap {
    display: flex; align-items: center; gap: 10px;
    background: var(--color-surface-2); border: 1.5px solid var(--color-border);
    border-radius: 14px; padding: 4px 14px;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .cg-search-wrap:focus-within {
    border-color: var(--color-primary); background: var(--color-surface);
    box-shadow: 0 0 0 4px var(--color-input-focus);
  }
  .cg-search-icon { color: var(--color-text-dim); flex-shrink: 0; transition: color 0.2s; }
  .cg-search-wrap:focus-within .cg-search-icon { color: var(--color-primary); }
  .cg-search-input {
    flex: 1; background: none; border: none;
    color: var(--color-text); font-size: 14px;
    padding: 11px 0; outline: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .cg-search-input::placeholder { color: var(--color-text-dim); }
  .cg-clear-btn {
    background: none; border: none; color: var(--color-text-dim);
    cursor: pointer; display: flex; align-items: center;
    padding: 4px; transition: color 0.15s;
  }
  .cg-clear-btn:hover { color: var(--color-text); }

  /* Searching / empty states */
  .cg-searching-state {
    display: flex; align-items: center; gap: 12px;
    justify-content: center; padding: 20px;
    color: var(--color-text-dim); font-size: 13px;
  }
  .cg-pulse-dots { display: flex; gap: 5px; }
  .cg-pulse-dots span {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--color-primary);
    animation: cg-bounce 1.1s ease-in-out infinite;
  }
  .cg-pulse-dots span:nth-child(2) { animation-delay: 0.18s; }
  .cg-pulse-dots span:nth-child(3) { animation-delay: 0.36s; }
  @keyframes cg-bounce {
    0%,80%,100% { transform: scale(0.6); opacity: 0.5; }
    40%          { transform: scale(1);   opacity: 1; }
  }
  .cg-empty-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 10px; padding: 28px; color: var(--color-text-dim);
    font-size: 13px; text-align: center;
  }
  .cg-empty-icon { opacity: 0.3; }

  /* Results list — scrollable, NOT clipped */
  .cg-results-list {
    display: flex; flex-direction: column;
    max-height: 260px;
    overflow-y: auto;
    overflow-x: hidden;
    border-radius: 14px;
    border: 1.5px solid var(--color-border);
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    background: var(--color-surface);
  }
  .cg-result-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px; cursor: pointer;
    background: transparent; transition: background 0.12s;
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-border);
  }
  .cg-result-row:last-child { border-bottom: none; }
  .cg-result-row:hover { background: var(--color-surface-2); }
  .cg-result-row--selected { background: var(--color-primary-light) !important; }
  .cg-result-avatar-wrap { position: relative; flex-shrink: 0; }
  .cg-result-avatar { width: 40px; height: 40px; border-radius: 12px; object-fit: cover; display: block; }
  .cg-online-dot {
    position: absolute; bottom: -1px; right: -1px;
    width: 11px; height: 11px; border-radius: 50%;
    background: #22c55e; border: 2px solid var(--color-surface);
  }
  .cg-result-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .cg-result-name { font-size: 14px; font-weight: 600; color: var(--color-text); }
  .cg-result-email { font-size: 12px; color: var(--color-text-dim); }
  .cg-check-circle {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid var(--color-border);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  }
  .cg-check-circle--on {
    background: var(--color-primary); border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-input-focus);
  }

  /* Error */
  .cg-error-banner {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--color-error);
    background: rgba(241,92,109,0.08); border: 1px solid rgba(241,92,109,0.25);
    border-radius: 10px; padding: 10px 14px;
  }

  /* Create CTA */
  .cg-create-btn {
    width: 100%; position: relative; overflow: hidden;
    background: linear-gradient(135deg, var(--color-primary) 0%, #a78bfa 100%);
    color: #fff; border: none; border-radius: 14px; padding: 15px 20px;
    font-size: 15px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: filter 0.2s, transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 20px rgba(0,0,0,0.18); letter-spacing: 0.2px;
  }
  .cg-create-btn:hover:not(:disabled) {
    transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.25);
    filter: brightness(1.08);
  }
  .cg-create-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .cg-btn-shine {
    position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
    animation: cg-shine 2.5s ease-in-out infinite; pointer-events: none;
  }
  @keyframes cg-shine { 0% { left: -100%; } 60%,100% { left: 200%; } }
  @keyframes cg-spin   { to { transform: rotate(360deg); } }

  /* Member hint */
  .cg-member-hint {
    text-align: center;
    font-size: 13px;
    font-weight: 500;
    padding: 4px 0;
  }
  .cg-member-hint--warn { color: var(--color-text-muted); }
  .cg-member-hint--ok   { color: #22c55e; }
`

if (typeof document !== 'undefined' && !document.getElementById('cg-styles')) {
  const el = document.createElement('style')
  el.id = 'cg-styles'
  el.textContent = STYLES
  document.head.appendChild(el)
}

// ── Memoised result row ───────────────────────────────────────────────────────
const ResultRow = React.memo(function ResultRow({ user, selected, onToggle }) {
  const src = user.avatar || generateAvatar(user.name || 'U')
  return (
    <div
      className={`cg-result-row${selected ? ' cg-result-row--selected' : ''}`}
      onClick={() => onToggle(user)}
    >
      <div className="cg-result-avatar-wrap">
        <img src={src} alt={user.name} className="cg-result-avatar" loading="lazy" />
        {user.isOnline && <span className="cg-online-dot" />}
      </div>
      <div className="cg-result-info">
        <span className="cg-result-name">{user.name}</span>
        <span className="cg-result-email">{user.email}</span>
      </div>
      <div className={`cg-check-circle${selected ? ' cg-check-circle--on' : ''}`}>
        {selected && <Check size={11} color="#fff" strokeWidth={3} />}
      </div>
    </div>
  )
})

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'cg-spin 0.7s linear infinite', flexShrink: 0 }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

// ── Shared card content ───────────────────────────────────────────────────────
function CreateGroupCard({
  groupName, setGroupName,
  description, setDescription,
  avatarPreview, avatarInputRef, handleAvatarChange,
  searchQuery, setSearchQuery,
  searchResults, setSearchResults,
  searching,
  selectedUsers, toggleUser, removeSelected,
  creating, error,
  activeStep, setActiveStep,
  handleCreate,
  canCreate, canCreateGroup,
  initials, barWidth,
  selectedSet,
  // whether to show desktop back button inside card (hidden on mobile)
  showCardBackBtn,
  onBack,
}) {
  return (
    <div className="cg-card">

      {/* ── Header (hidden on mobile — header is in MobilePageHeader) ── */}
      {showCardBackBtn && (
        <div className="cg-header">
          <button className="cg-back-btn" onClick={onBack} title="Back">
            <ArrowLeft size={18} />
          </button>
          <div className="cg-header-text">
            <h1 className="cg-title">
              <Sparkles size={16} className="cg-title-icon" />
              Create New Group
            </h1>
            <p className="cg-subtitle">Build your community</p>
          </div>
        </div>
      )}

      {/* ── Step indicators ── */}
      <div className="cg-steps">
        <div
          className={`cg-step ${activeStep >= 1 ? 'cg-step--active' : ''}`}
          onClick={() => setActiveStep(1)}
        >
          <div className="cg-step-num">1</div>
          <span className="cg-step-label">Group Info</span>
        </div>
        <div className="cg-step-line" />
        <div
          className={`cg-step ${activeStep >= 2 ? 'cg-step--active' : ''}`}
          onClick={() => canCreate && setActiveStep(2)}
        >
          <div className="cg-step-num">2</div>
          <span className="cg-step-label">Add Members</span>
        </div>
      </div>

      {/* ══ STEP 1: Group Info ══ */}
      {activeStep === 1 && (
        <div className="cg-step-panel cg-fade-in">

          <div className="cg-hero-zone">
            <div
              className="cg-avatar-ring"
              onClick={() => avatarInputRef.current?.click()}
              title="Change photo"
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="Group" className="cg-avatar-img" />
                : <div className="cg-avatar-initials">{initials}</div>
              }
              <div className="cg-avatar-overlay">
                <Camera size={22} />
                <span>Change Photo</span>
              </div>
              <input
                ref={avatarInputRef}
                type="file" accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>
            <p className="cg-avatar-hint">Click to upload group photo</p>
          </div>

          <div className="cg-field-group">
            <div className="cg-input-wrap">
              <Hash size={15} className="cg-field-icon" />
              <input
                className="cg-input"
                placeholder="Give your group a name…"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                maxLength={60}
                autoFocus
              />
              <span className="cg-char-pill">{groupName.length}/60</span>
            </div>
            <div className="cg-input-bar" style={{ width: barWidth }} />
          </div>

          <div className="cg-field-group">
            <label className="cg-floating-label">
              Description
              <span className="cg-optional-tag">optional</span>
            </label>
            <textarea
              className="cg-textarea"
              placeholder="What is this group about? Give members context…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
            />
            <span className="cg-char-right">{description.length}/200</span>
          </div>

          <button
            className="cg-next-btn"
            onClick={() => canCreate && setActiveStep(2)}
            disabled={!canCreate}
          >
            <span>Continue to Add Members</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

        </div>
      )}

      {/* ══ STEP 2: Add Members ══ */}
      {activeStep === 2 && (
        <div className="cg-step-panel cg-fade-in">

          {/* Group preview banner */}
          <div className="cg-group-preview">
            {avatarPreview
              ? <img src={avatarPreview} alt="Group" className="cg-preview-avatar" />
              : <div className="cg-preview-initials">{initials}</div>
            }
            <div className="cg-preview-info">
              <span className="cg-preview-name">{groupName}</span>
              {description && <span className="cg-preview-desc">{description}</span>}
            </div>
            <div className="cg-member-badge">
              <Users size={12} />
              {selectedUsers.length + 1}
            </div>
          </div>

          {/* Selected member chips */}
          {selectedUsers.length > 0 && (
            <div className="cg-chips-zone">
              <span className="cg-chips-header">
                <Users size={12} />
                Selected ({selectedUsers.length})
              </span>
              <div className="cg-chips">
                {selectedUsers.map(u => {
                  const uid = u._id || u.id
                  const src = u.avatar || generateAvatar(u.name || 'U')
                  return (
                    <div key={uid} className="cg-chip">
                      <img src={src} alt={u.name} className="cg-chip-avatar" />
                      <span className="cg-chip-name">{u.name?.split(' ')[0]}</span>
                      <button className="cg-chip-x" onClick={() => removeSelected(uid)}>
                        <X size={10} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Search input */}
          <div className="cg-search-wrap">
            <Search size={15} className="cg-search-icon" />
            <input
              className="cg-search-input"
              placeholder="Search people by name or email…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoComplete="off"
              autoFocus
            />
            {searchQuery && (
              <button className="cg-clear-btn" onClick={() => { setSearchQuery(''); setSearchResults([]) }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Searching indicator */}
          {searching && (
            <div className="cg-searching-state">
              <div className="cg-pulse-dots"><span /><span /><span /></div>
              <span>Searching…</span>
            </div>
          )}

          {/* No results */}
          {!searching && searchQuery.trim() && searchResults.length === 0 && (
            <div className="cg-empty-state">
              <Search size={32} className="cg-empty-icon" />
              <span>No users found for "<strong>{searchQuery}</strong>"</span>
            </div>
          )}

          {/* Results list */}
          {searchResults.length > 0 && (
            <div className="cg-results-list">
              {searchResults.map(u => (
                <ResultRow
                  key={u._id || u.id}
                  user={u}
                  selected={selectedSet.has(u._id || u.id)}
                  onToggle={toggleUser}
                />
              ))}
            </div>
          )}

          {/* Member count hint */}
          <div className="cg-member-hint">
            {selectedUsers.length === 0 && (
              <span className="cg-member-hint--warn">Add at least 2 members to create a group</span>
            )}
            {selectedUsers.length === 1 && (
              <span className="cg-member-hint--warn">Add 1 more member to continue</span>
            )}
            {selectedUsers.length >= 2 && (
              <span className="cg-member-hint--ok">✓ {selectedUsers.length} members selected — ready to create</span>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="cg-error-banner">
              <X size={14} />
              {error}
            </div>
          )}

          {/* Create button */}
          <button
            className="cg-create-btn"
            onClick={handleCreate}
            disabled={!canCreateGroup || creating}
          >
            {creating ? (
              <><Spinner /><span>Launching your group…</span></>
            ) : (
              <>
                <Users size={17} />
                <span>
                  Create Group & Invite {selectedUsers.length}
                </span>
                <div className="cg-btn-shine" />
              </>
            )}
          </button>

        </div>
      )}

    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CreateGroup() {
  const navigate        = useNavigate()
  const { currentUser } = useAuth()
  const addRoom         = useChatStore(state => state.setRooms)
  const existingRooms   = useChatStore(state => state.rooms)
  const { isMobile }    = useMobileNav()

  const [groupName,     setGroupName]     = useState('')
  const [description,   setDescription]   = useState('')
  const [avatarFile,    setAvatarFile]    = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,     setSearching]     = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [creating,      setCreating]      = useState(false)
  const [error,         setError]         = useState('')
  const [activeStep,    setActiveStep]    = useState(1)

  const avatarInputRef = useRef(null)
  const debouncedQuery = useDebounce(searchQuery, 400)

  const selectedSet = useMemo(
    () => new Set(selectedUsers.map(u => u._id || u.id)),
    [selectedUsers]
  )

  useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q) { setSearchResults([]); return }
    setSearching(true)
    userService.searchUsers(q)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data
          : Array.isArray(res.data?.users) ? res.data.users
          : []
        const filtered = list.filter(
          u => (u._id || u.id) !== (currentUser?._id || currentUser?.id)
        )
        setSearchResults(filtered)
      })
      .catch(err => {
        console.error('[CreateGroup] search error:', err)
        setSearchResults([])
      })
      .finally(() => setSearching(false))
  }, [debouncedQuery, currentUser])

  const handleAvatarChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }, [])

  const toggleUser = useCallback((user) => {
    setSelectedUsers(prev => {
      const id = user._id || user.id
      if (prev.some(u => (u._id || u.id) === id)) {
        return prev.filter(u => (u._id || u.id) !== id)
      }
      return [...prev, user]
    })
  }, [])

  const removeSelected = useCallback((userId) => {
    setSelectedUsers(prev => prev.filter(u => (u._id || u.id) !== userId))
  }, [])

  const handleCreate = async () => {
    setError('')
    if (!groupName.trim()) { setError('Group name is required.'); return }
    setCreating(true)
    try {
      const res = await groupService.createGroup({
        groupName:   groupName.trim(),
        description: description.trim(),
        memberIds:   [],
        avatar:      avatarFile,
      })
      const newRoom = res.data.room
      const normalised = {
        ...newRoom,
        id: newRoom._id || newRoom.id,
        participantIds: (newRoom.participantIds || []).map(p =>
          typeof p === 'object' ? { ...p, id: p._id || p.id } : p
        ),
        lastMessage: null,
      }
      addRoom([normalised, ...existingRooms])
      if (selectedUsers.length > 0) {
        await groupService.inviteUsers(normalised.id, selectedUsers.map(u => u._id || u.id))
      }
      navigate(`/group/${normalised.id}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const canCreate      = groupName.trim().length > 0
  const canCreateGroup = canCreate && selectedUsers.length >= 2
  const initials       = useMemo(() =>
    groupName ? groupName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'GR'
  , [groupName])
  const barWidth = `${Math.min((groupName.length / 60) * 100, 100)}%`

  const cardProps = {
    groupName, setGroupName,
    description, setDescription,
    avatarPreview, avatarInputRef, handleAvatarChange,
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    searching,
    selectedUsers, toggleUser, removeSelected,
    creating, error,
    activeStep, setActiveStep,
    handleCreate,
    canCreate, canCreateGroup,
    initials, barWidth,
    selectedSet,
  }

  // ── MOBILE: full-screen page ────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="cg-mobile-shell">
        <MobilePageHeader
          title={activeStep === 1 ? 'New Group' : 'Add Members'}
          fallbackPath='/'
        />
        <div className="cg-mobile-content">
          <div className="cg-bg-orb cg-bg-orb--1" aria-hidden="true" />
          <div className="cg-bg-orb cg-bg-orb--2" aria-hidden="true" />
          <CreateGroupCard
            {...cardProps}
            showCardBackBtn={false}
            onBack={null}
          />
        </div>
      </div>
    )
  }

  // ── DESKTOP / TABLET: original layout unchanged ─────────────────────────────
  return (
    <div className="cg-shell">
      <Navbar />
      <div className="cg-body">
        <Sidebar />
        <main className="cg-main">

          <div className="cg-bg-orb cg-bg-orb--1" aria-hidden="true" />
          <div className="cg-bg-orb cg-bg-orb--2" aria-hidden="true" />
          <div className="cg-bg-orb cg-bg-orb--3" aria-hidden="true" />

          <CreateGroupCard
            {...cardProps}
            showCardBackBtn={true}
            onBack={() => navigate(-1)}
          />
        </main>
      </div>
    </div>
  )
}