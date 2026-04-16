/**
 * Sidebar.jsx
 *
 * Left navigation panel — ChatGPT + SaaS dashboard style.
 *
 * Props:
 *   history       – array of { id, label } past sessions
 *   activeId      – id of the currently active session
 *   onSelectSession – callback(id)
 *   onNewChat     – callback() to start fresh
 *   collapsed     – bool
 *   onToggle      – callback() to toggle collapsed state
 */

export default function Sidebar({ history, activeId, onSelectSession, onNewChat, collapsed, onToggle }) {
  return (
    <aside
      className={`
        shrink-0 flex flex-col bg-gray-900 border-r border-gray-800
        transition-all duration-200 ease-in-out overflow-hidden
        ${collapsed ? 'w-14' : 'w-60'}
      `}
    >
      {/* ── Top: logo + toggle ───────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-gray-800/60">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
            className="w-4 h-4 text-indigo-400">
            <path d="M16.5 7.5h-9v9h9v-9Z"/>
            <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75ZM6 6.75A.75.75 0 0 1 6.75 6h10.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V6.75Z" clipRule="evenodd"/>
          </svg>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-100 leading-none truncate">Deca Agent</p>
            <p className="text-[10px] text-gray-500 mt-0.5">IT Automation</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M3 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z" clipRule="evenodd"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── New chat button ──────────────────────────────────────── */}
      <div className="px-2 pt-3 pb-2">
        <button
          onClick={onNewChat}
          className={`
            w-full flex items-center gap-2.5 rounded-xl px-3 py-2
            border border-dashed border-gray-700 hover:border-indigo-500/50
            text-gray-400 hover:text-indigo-300 hover:bg-indigo-600/5
            transition-colors duration-150 text-sm
          `}
          title="New chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/>
          </svg>
          {!collapsed && <span className="truncate">New chat</span>}
        </button>
      </div>

      {/* ── History list ─────────────────────────────────────────── */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {history.length > 0 && (
            <p className="text-[10px] font-medium text-gray-600 uppercase tracking-wider px-2 py-2">
              Recent
            </p>
          )}
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectSession(item.id)}
              className={`
                w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-2
                text-sm truncate transition-colors duration-100
                ${activeId === item.id
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0 opacity-60">
                <path fillRule="evenodd" d="M2 10c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8-8-3.582-8-8Zm8.75-3.25a.75.75 0 0 0-1.5 0V10c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5V6.75Z" clipRule="evenodd"/>
              </svg>
              <span className="truncate">{item.label}</span>
            </button>
          ))}

          {history.length === 0 && (
            <p className="text-xs text-gray-600 px-2 py-3">No history yet.</p>
          )}
        </div>
      )}

      {/* ── Bottom: nav links ────────────────────────────────────── */}
      <div className="border-t border-gray-800/60 px-2 py-3 space-y-0.5">
        {[
          {
            label: 'Feedback log',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.238a1 1 0 0 0 0 1.962l1.192.238a1 1 0 0 1 .785.785l.238 1.192a1 1 0 0 0 1.962 0l.238-1.192a1 1 0 0 1 .785-.785l1.192-.238a1 1 0 0 0 0-1.962l-1.192-.238a1 1 0 0 1-.785-.785l-.238-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684Z"/>
              </svg>
            ),
          },
          {
            label: 'Settings',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .205 1.251l-1.18 2.044a1 1 0 0 1-1.186.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.205-1.251l1.18-2.044a1 1 0 0 1 1.186-.447l1.598.54A6.993 6.993 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd"/>
              </svg>
            ),
          },
        ].map(({ label, icon }) => (
          <button
            key={label}
            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-500 hover:text-gray-200 hover:bg-gray-800/60 transition-colors"
            title={label}
          >
            <span className="shrink-0">{icon}</span>
            {!collapsed && <span className="truncate">{label}</span>}
          </button>
        ))}
      </div>
    </aside>
  )
}
