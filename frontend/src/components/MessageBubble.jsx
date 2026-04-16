/**
 * MessageBubble.jsx
 */

import ReactMarkdown from 'react-markdown'
import FeedbackControls from './FeedbackControls'

/* ── Sub-components ──────────────────────────────────────────────── */

function AgentAvatar() {
  return (
    <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mt-0.5">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
        className="w-4 h-4 text-indigo-400">
        <path d="M16.5 7.5h-9v9h9v-9Z"/>
        <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75ZM6 6.75A.75.75 0 0 1 6.75 6h10.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V6.75Z" clipRule="evenodd"/>
      </svg>
    </div>
  )
}

function ThinkingDots() {
  return (
    <span className="dots-loading inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
    </span>
  )
}

function CacheBadge({ cacheStr }) {
  if (!cacheStr) return null
  const hit = cacheStr.toUpperCase().includes('CACHE HIT')
  return hit ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      Cache hit
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400 border border-gray-600/30">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" />
      First run
    </span>
  )
}

/**
 * Renders agent output as markdown.
 * Uses react-markdown with lightweight prose styling applied via className overrides.
 */
function MarkdownOutput({ content }) {
  // Coerce to string in case the SDK returns an object or null
  const safe = content != null ? String(content) : '(No output)'
  return (
    <ReactMarkdown
      components={{
        p:      ({ children }) => <p className="text-sm text-gray-200 leading-relaxed mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-gray-100">{children}</strong>,
        em:     ({ children }) => <em className="italic text-gray-300">{children}</em>,
        ul:     ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-sm text-gray-300">{children}</ul>,
        ol:     ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-sm text-gray-300">{children}</ol>,
        li:     ({ children }) => <li className="text-gray-300 leading-relaxed">{children}</li>,
        code:   ({ children }) => (
          <code className="bg-gray-700/60 text-indigo-300 text-xs font-mono px-1.5 py-0.5 rounded">{children}</code>
        ),
        pre:    ({ children }) => (
          <pre className="bg-gray-900 border border-gray-700/50 rounded-xl px-4 py-3 text-xs font-mono text-gray-300 overflow-x-auto mb-2">{children}</pre>
        ),
        h1: ({ children }) => <h1 className="text-base font-semibold text-gray-100 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-semibold text-gray-100 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-medium text-gray-200 mb-1">{children}</h3>,
        a:  ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300">
            {children}
          </a>
        ),
      }}
    >
      {safe}
    </ReactMarkdown>
  )
}

/* ── Main component ──────────────────────────────────────────────── */

export default function MessageBubble({ message, onUpdate }) {
  const { type, text, result } = message

  /* USER — right-aligned */
  if (type === 'user') {
    return (
      <div className="flex justify-end px-4">
        <div className="max-w-[72%] bg-indigo-600 text-white text-sm leading-relaxed rounded-2xl rounded-br-sm px-4 py-3 shadow-sm">
          {text}
        </div>
      </div>
    )
  }

  /* PROGRESS / THINKING */
  if (type === 'progress') {
    const log = (message.log ?? [text]).map((e) => (e != null ? String(e) : ''))
    return (
      <div className="flex items-start gap-3 px-4">
        <AgentAvatar />
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[78%] w-full">
          {/* Header row */}
          <div className="flex items-center gap-2 mb-2">
            <ThinkingDots />
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Agent working…</span>
          </div>
          {/* Live log feed */}
          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700">
            {log.map((entry, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-indigo-500/60 text-[10px] font-mono mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span className={`text-xs leading-snug ${i === log.length - 1 ? 'text-gray-200' : 'text-gray-500'}`}>
                  {entry}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ERROR */
  if (type === 'error') {
    return (
      <div className="flex items-start gap-3 px-4">
        <AgentAvatar />
        <div className="max-w-[75%] bg-red-950/50 border border-red-800/40 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Error</p>
          <p className="text-sm text-red-300/80 leading-relaxed">{text}</p>
        </div>
      </div>
    )
  }

  /* AGENT RESPONSE */
  const cacheStr = result?.cache ?? ''
  const steps    = result?.steps  ?? null
  const output   = result?.output ?? result?.result ?? text ?? 'No output returned.'

  return (
    <div className="flex items-start gap-3 px-4">
      <AgentAvatar />

      <div className="max-w-[75%] bg-gray-800/70 border border-gray-700/40 rounded-2xl rounded-tl-sm px-4 pt-3 pb-2 shadow-sm">

        {/* Meta: cache badge + step count */}
        <div className="flex items-center gap-2 mb-2.5">
          <CacheBadge cacheStr={cacheStr} />
          {steps != null && (
            <span className="text-[10px] text-gray-500">{steps} step{steps !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Rendered markdown output */}
        <div className="mb-1">
          <MarkdownOutput content={output} />
        </div>

        {/* Feedback — bottom-right inside the bubble */}
        <div className="flex justify-end pt-2 border-t border-gray-700/30">
          <FeedbackControls message={message} onUpdate={onUpdate} />
        </div>
      </div>
    </div>
  )
}
