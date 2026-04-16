import { useState, useRef } from "react";

export default function InputBar({ onSubmit, isRunning }) {
  const [task, setTask] = useState("");
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (task.trim() && !isRunning) {
      onSubmit(task);
      setTask("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleInput = (e) => {
    setTask(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  return (
    <div className="w-full shrink-0 bg-transparent pt-2 pb-4 relative">
      {/* Gradient fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/95 to-transparent pointer-events-none -top-8" />

      <div className="max-w-[800px] mx-auto px-4 relative z-10">
        <form
          onSubmit={handleSubmit}
          className={`relative flex items-end gap-2 bg-[#18181b] border rounded-2xl p-1.5 pl-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] transition-all duration-300 ${
            isRunning
              ? "border-white/[0.04] opacity-70"
              : "border-white/[0.06] focus-within:border-emerald-500/30 focus-within:shadow-[0_0_20px_rgba(16,185,129,0.06)]"
          }`}
        >
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-[#f4f4f5] placeholder-[#3f3f46] py-3 outline-none resize-none min-h-[44px] max-h-[160px] text-[15px] leading-relaxed overflow-y-auto disabled:opacity-40 disabled:cursor-not-allowed"
            rows={1}
            placeholder={isRunning ? "Working on it..." : "Ask me to manage users..."}
            value={task}
            onChange={handleInput}
            disabled={isRunning}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!task.trim() || isRunning}
            className="w-9 h-9 mb-0.5 bg-white text-[#09090b] hover:bg-[#e4e4e7] disabled:bg-[#27272a] disabled:text-[#3f3f46] rounded-xl transition-all duration-200 shrink-0 flex items-center justify-center active:scale-95"
          >
            {isRunning ? (
              <div className="w-3.5 h-3.5 border-2 border-[#3f3f46] border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
              </svg>
            )}
          </button>
        </form>

        <p className="text-center mt-2.5 text-[11px] text-[#27272a] tracking-tight">
          IT Agent can make mistakes. Verify important actions.
        </p>
      </div>
    </div>
  );
}
