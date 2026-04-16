/**
 * FeedbackControls.jsx
 *
 * Compact thumbs-up / thumbs-down icons rendered inside the agent bubble.
 * Very low opacity at rest → full opacity on hover (ChatGPT-style).
 *
 * Props:
 *   message   – message object
 *   onUpdate  – callback(updatedMessage) for live result replacement on thumbs-down
 */

export default function FeedbackControls({ message, onUpdate }) {
  const voted = !!message.feedback

  async function handleFeedback(type) {
    if (voted) return
    try {
      const res  = await fetch('/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          task:       message.task,
          feedback:   type,
          old_result: message.result ?? {},
        }),
      })
      const data = await res.json()
      if (type === 'down' && data.best_result) {
        onUpdate({ ...message, feedback: 'down', result: data.best_result })
      } else {
        onUpdate({ ...message, feedback: type })
      }
    } catch { /* non-critical */ }
  }

  const btnBase = 'transition-all duration-150 cursor-pointer'

  const iconClass = (type) => {
    const active = message.feedback === type
    return `${btnBase} ${
      active
        ? 'text-indigo-400 opacity-100'
        : voted
          ? 'text-gray-600 opacity-40 cursor-default'
          : 'text-gray-500 opacity-40 hover:opacity-100 hover:text-gray-200'
    }`
  }

  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={() => handleFeedback('up')}
        disabled={voted}
        title="Good response"
        aria-label="Thumbs up"
        className={iconClass('up')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M1 8.25a1.25 1.25 0 1 1 2.5 0v7.5a1.25 1.25 0 0 1-2.5 0v-7.5ZM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0 1 14 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 0 1-1.341 5.974C17.153 16.323 16.072 17 14.9 17H8.171a2 2 0 0 1-1.179-.387L4 14.5V8.5l3.82-3.283A2 2 0 0 1 9 4.83l.405-.405A2 2 0 0 1 11 3Z" />
        </svg>
      </button>

      <button
        onClick={() => handleFeedback('down')}
        disabled={voted}
        title="Poor response"
        aria-label="Thumbs down"
        className={iconClass('down')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M18.905 12.75a1.25 1.25 0 1 1-2.5 0v-7.5a1.25 1.25 0 0 1 2.5 0v7.5ZM8.905 17v1.3c0 .268-.14.526-.395.607A2 2 0 0 1 5.905 17c0-.995.182-1.948.514-2.826.204-.54-.166-1.174-.744-1.174h-2.52c-1.243 0-2.261-1.01-2.146-2.247.193-2.08.651-4.082 1.341-5.974C2.752 3.678 3.833 3 5.005 3h6.728a2 2 0 0 1 1.179.387L16 5.5v6l-3.82 3.283A2 2 0 0 1 10.905 15.17l-.405.405A2 2 0 0 1 8.905 17Z" />
        </svg>
      </button>
    </div>
  )
}
