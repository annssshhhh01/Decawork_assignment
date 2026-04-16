import ReactMarkdown from "react-markdown";
import FeedbackControls from "./FeedbackControls";

export default function MessageBubble({ message, onRetry, onUpdate, isLast }) {
  const { role, text, type } = message;

  // ── Typing dots ──
  if (type === "typing") {
    return (
      <div className="flex items-end gap-3.5 animate-[fadeIn_0.3s_ease-out]">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
          <span className="text-white text-[10px] font-bold">AI</span>
        </div>
        <div className="bg-[#18181b] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-white/[0.06]">
          <div className="flex items-center gap-1.5 h-5">
            <div className="w-1.5 h-1.5 bg-[#52525b] rounded-full animate-[pulse_1.5s_infinite_0ms]" />
            <div className="w-1.5 h-1.5 bg-[#52525b] rounded-full animate-[pulse_1.5s_infinite_300ms]" />
            <div className="w-1.5 h-1.5 bg-[#52525b] rounded-full animate-[pulse_1.5s_infinite_600ms]" />
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmation modal ──
  if (type === "confirm") {
    return (
      <div className="flex items-end gap-3.5 animate-[fadeIn_0.3s_ease-out]">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
          <span className="text-white text-[10px] font-bold">AI</span>
        </div>
        <div className="bg-[#18181b] rounded-2xl rounded-bl-md p-5 shadow-lg border border-amber-500/20 max-w-[85%]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-500 text-base">⚠️</span>
            <span className="text-amber-400 font-semibold text-[13px] tracking-wide uppercase">
              Confirmation Required
            </span>
          </div>
          <p className="text-[#d4d4d8] text-[15px] mb-5 leading-relaxed">
            Please confirm: <span className="text-white font-medium">{message.task}</span>
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={message.onConfirm}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-[13px] font-medium transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
            >
              Approve
            </button>
            <button
              onClick={message.onCancel}
              className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] text-[13px] font-medium transition-all border border-white/[0.06]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Error result ──
  if (type === "error") {
    return (
      <div className="flex items-start gap-3.5 animate-[fadeIn_0.4s_ease-out]">
        <div className="w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20 mt-0.5">
          <span className="text-white text-[10px] font-bold">!</span>
        </div>
        <div className="flex-1 max-w-[85%]">
          <div className="bg-red-500/[0.06] border border-red-500/15 rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
            <p className="text-red-300 text-[15px] leading-relaxed">{text}</p>
          </div>
          {/* Feedback + Retry */}
          {isLast && (
            <div className="flex items-center justify-between mt-2 px-1">
              <button
                onClick={onRetry}
                className="text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
                </svg>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Success result card ──
  if (type === "result") {
    return (
      <div className="flex items-start gap-3.5 animate-[fadeIn_0.4s_ease-out]">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 mt-0.5">
          <span className="text-white text-[10px] font-bold">AI</span>
        </div>
        <div className="flex-1 max-w-[85%]">
          {/* Result card */}
          <div className="bg-[#18181b] border border-emerald-500/15 rounded-2xl rounded-tl-md px-5 py-5 shadow-lg shadow-emerald-500/[0.03]">
            {/* Success indicator */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              <span className="text-emerald-400 text-[11px] font-semibold tracking-widest uppercase">
                Completed
              </span>
            </div>
            {/* Content */}
            <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-p:text-[15px] prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-white/5 text-[#e4e4e7]">
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          </div>

          {/* Feedback row */}
          {isLast && (
            <div className="flex items-center justify-between mt-2.5 px-1">
              <FeedbackControls message={message} onUpdate={onUpdate} />
              <button
                onClick={onRetry}
                className="text-[12px] text-[#3f3f46] hover:text-[#a1a1aa] transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
                </svg>
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Progress (only shown if stacked in messages array — rare now) ──
  if (type === "progress") {
    return (
      <div className="flex items-center gap-3.5 animate-[fadeIn_0.2s_ease-out]">
        <div className="w-8 shrink-0" />
        <p className="text-[#52525b] text-[13px] font-mono">{text}</p>
      </div>
    );
  }

  // ── User bubble ──
  return (
    <div className="flex items-end gap-3.5 flex-row-reverse animate-[fadeIn_0.3s_ease-out]">
      <div className="w-8 h-8 rounded-full bg-[#27272a] border border-white/[0.08] flex items-center justify-center shrink-0">
        <span className="text-[#a1a1aa] text-[11px] font-semibold">U</span>
      </div>
      <div className="bg-white/[0.07] rounded-2xl rounded-br-md px-5 py-3 shadow-md max-w-[85%] border border-white/[0.06]">
        <p className="text-[#f4f4f5] text-[15px] leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
