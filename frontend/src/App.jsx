/**
 * App.jsx
 *
 * Root layout:
 *   ┌─────────┬──────────────────────────┐
 *   │ Sidebar │  Header                  │
 *   │  (nav)  ├──────────────────────────┤
 *   │         │  ChatWindow (scrollable) │
 *   │         ├──────────────────────────┤
 *   │         │  InputBox (fixed bottom) │
 *   └─────────┴──────────────────────────┘
 *
 * State:
 *   sessions        – array of { id, label, messages }
 *   activeSessionId – current session id
 *   isRunning       – agent executing
 *   pendingConfirm  – high-risk confirmation pending
 *   sidebarOpen     – sidebar expanded vs. icon-only
 */

import { useState, useCallback, useEffect } from 'react'
import socket from './socket'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import InputBox from './components/InputBox'
import ConfirmationModal from './components/ConfirmationModal'

/* ── Helpers ─────────────────────────────────────────────────────── */
let _nextId = 1
const uid = () => String(_nextId++)
const PROGRESS_ID = '__progress__'

function newSession() {
  return { id: uid(), label: 'New chat', messages: [] }
}

/* ── Component ───────────────────────────────────────────────────── */
export default function App() {
  const [sessions,        setSessions]        = useState([newSession()])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [isRunning,       setIsRunning]       = useState(false)
  const [pendingConfirm,  setPendingConfirm]  = useState(null)
  const [sidebarOpen,     setSidebarOpen]     = useState(true)

  // Resolve active session id on first render
  const activeId = activeSessionId ?? sessions[0]?.id

  // Active session object
  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[0]
  const messages = activeSession?.messages ?? []

  /* ── Helpers to mutate only the active session's messages ──────── */
  function setMessages(updater) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeId
          ? { ...s, messages: typeof updater === 'function' ? updater(s.messages) : updater }
          : s
      )
    )
  }

  function labelSession(task) {
    // Use first 40 chars of the task as the session label
    const label = task.length > 40 ? task.slice(0, 40) + '…' : task
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeId && s.label === 'New chat' ? { ...s, label } : s
      )
    )
  }

  /* ── WebSocket listeners ──────────────────────────────────────── */
  useEffect(() => {
    function onProgress({ message }) {
      const safeMsg = message != null ? String(message) : ''
      if (!safeMsg) return
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === PROGRESS_ID)
        if (idx === -1) return prev
        const updated = [...prev]
        const existing = updated[idx]
        const log = existing.log ? [...existing.log, safeMsg] : [safeMsg]
        updated[idx] = { ...existing, text: safeMsg, log }
        return updated
      })
    }

    function onDone(result) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === PROGRESS_ID
            ? { ...m, id: uid(), type: 'agent', text: null, result }
            : m
        )
      )
      setIsRunning(false)
    }

    function onError({ message }) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === PROGRESS_ID
            ? { ...m, id: uid(), type: 'error', text: message }
            : m
        )
      )
      setIsRunning(false)
    }

    function onConfirmationRequired({ task }) {
      setMessages((prev) => prev.filter((m) => m.id !== PROGRESS_ID))
      setIsRunning(false)
      setPendingConfirm({ task })
    }

    socket.on('progress',              onProgress)
    socket.on('done',                  onDone)
    socket.on('error',                 onError)
    socket.on('confirmation_required', onConfirmationRequired)

    return () => {
      socket.off('progress',              onProgress)
      socket.off('done',                  onDone)
      socket.off('error',                 onError)
      socket.off('confirmation_required', onConfirmationRequired)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  /* ── Send task ────────────────────────────────────────────────── */
  const sendTask = useCallback((task, confirmed = false) => {
    _emitTask(task, confirmed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  function _emitTask(task, confirmed = false) {
    setIsRunning(true)
    labelSession(task)

    if (!confirmed) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), type: 'user', text: task, task },
      ])
    }

    setMessages((prev) => [
      ...prev,
      { id: PROGRESS_ID, type: 'progress', text: 'Initializing request', log: ['Initializing request…'], task },
    ])

    socket.emit('run_task', { task, confirm: confirmed })
  }

  /* ── Confirmation modal ───────────────────────────────────────── */
  function handleConfirm() {
    const { task } = pendingConfirm
    setPendingConfirm(null)
    _emitTask(task, true)
  }
  function handleCancel() { setPendingConfirm(null) }

  /* ── Message update (feedback) ────────────────────────────────── */
  function handleMessageUpdate(updated) {
    setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  /* ── New chat / session switch ────────────────────────────────── */
  function handleNewChat() {
    const s = newSession()
    setSessions((prev) => [s, ...prev])
    setActiveSessionId(s.id)
  }

  function handleSelectSession(id) {
    setActiveSessionId(id)
  }

  /* ── Socket connection status ─────────────────────────────────── */
  const [connected, setConnected] = useState(socket.connected)
  useEffect(() => {
    const onConnect    = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect',    onConnect)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('connect',    onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="flex w-screen h-screen bg-gray-950 text-gray-100 overflow-hidden">

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <Sidebar
        history={sessions.filter((s) => s.messages.length > 0)}
        activeId={activeId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        collapsed={!sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      {/* ── Main column ────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Header */}
        <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm">
          <div>
            <h1 className="text-sm font-semibold text-gray-100 leading-none">
              {activeSession?.label ?? 'New chat'}
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5">IT Automation Agent</p>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-4">
            {/* WS connection */}
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-[11px] text-gray-500">{connected ? 'Connected' : 'Offline'}</span>
            </div>

            {/* Agent status */}
            {isRunning && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[11px] text-amber-400/80">Running</span>
              </div>
            )}
          </div>
        </header>

        {/* Chat */}
        <ChatWindow messages={messages} onUpdate={handleMessageUpdate} />

        {/* Input */}
        <InputBox onSend={sendTask} disabled={isRunning} />
      </div>

      {/* Confirmation modal */}
      {pendingConfirm && (
        <ConfirmationModal
          task={pendingConfirm.task}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}
