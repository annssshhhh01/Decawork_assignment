/**
 * InputBox.jsx
 *
 * Fixed bottom input bar — ChatGPT style.
 * Auto-grows up to 5 lines.
 * Enter → send  |  Shift+Enter → newline
 * Disabled while agent is running.
 */

import { useState, useRef, useEffect } from 'react'

export default function InputBox({ onSend, disabled }) {
  const [text, setText] = useState('')
  const taRef = useRef(null)

  // Auto-resize textarea height
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }, [text])

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  return (
    <div className="shrink-0 bg-gray-950 border-t border-gray-800/60 px-4 pt-3 pb-4">
      <div className="max-w-3xl mx-auto">
        <div className={`
          flex items-end gap-2 bg-gray-800/70 border rounded-2xl px-4 py-3
          transition-colors duration-150
          ${disabled ? 'border-gray-700/40' : 'border-gray-600/60 focus-within:border-indigo-500/50'}
        `}>
          <textarea
            ref={taRef}
            id="task-input"
            rows={1}
            className="
              flex-1 resize-none bg-transparent text-gray-100 placeholder-gray-500
              text-sm leading-relaxed focus:outline-none
              disabled:opacity-40 disabled:cursor-not-allowed
              max-h-[140px] overflow-y-auto
            "
            placeholder={disabled ? 'Agent is running…' : 'Describe a task for the agent…'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            disabled={disabled}
            aria-label="Task input"
          />

          <button
            id="send-button"
            onClick={submit}
            disabled={disabled || !text.trim()}
            aria-label="Send task"
            className="
              shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mb-0.5
              bg-indigo-600 hover:bg-indigo-500 active:scale-95
              disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-indigo-600
              transition-all duration-150
            "
          >
            {disabled ? (
              /* Spinner while running */
              <svg className="w-4 h-4 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"/>
              </svg>
            ) : (
              /* Send arrow */
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.813 6.932H10.5a.75.75 0 0 1 0 1.5H4.092l-1.813 6.932a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
              </svg>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
