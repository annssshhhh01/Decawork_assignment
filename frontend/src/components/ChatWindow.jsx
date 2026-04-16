/**
 * ChatWindow.jsx
 *
 * Full-height scrollable message column.
 * Auto-scrolls to the bottom whenever messages change.
 */

import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

export default function ChatWindow({ messages, onUpdate }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto py-6">

      {/* Empty state */}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-800/80 border border-gray-700/50 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              className="w-7 h-7 text-indigo-400/70">
              <path d="M16.5 7.5h-9v9h9v-9Z"/>
              <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75ZM6 6.75A.75.75 0 0 1 6.75 6h10.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V6.75Z" clipRule="evenodd"/>
            </svg>
          </div>
          <div>
            <p className="text-gray-300 text-sm font-medium">Deca IT Agent</p>
            <p className="text-gray-500 text-xs mt-1">Describe a task below to get started.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-md">
            {['List all active users', 'Search for ticket #2034', 'View system health status'].map((ex) => (
              <span key={ex} className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-500 bg-gray-800/40">
                {ex}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Message list — vertically stacked with consistent spacing */}
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onUpdate={onUpdate} />
        ))}
        {/* Scroll anchor */}
        <div ref={bottomRef} className="h-1" />
      </div>

    </div>
  )
}
