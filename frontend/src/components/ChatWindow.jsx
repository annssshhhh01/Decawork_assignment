import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import StepIndicator from "./StepIndicator";

export default function ChatWindow({ messages, isRunning, currentStep, onRetry, onMessageUpdate }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRunning, currentStep]);

  return (
    <div className="flex-1 overflow-y-auto w-full scroll-smooth">
      <div className="max-w-[800px] mx-auto px-4 py-6 flex flex-col gap-5 min-h-full justify-end">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80 my-auto animate-[fadeIn_0.6s_ease-out]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/10 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/5">
              <span className="text-3xl">✦</span>
            </div>
            <h2 className="text-[22px] font-semibold text-[#f4f4f5] mb-2 tracking-tight">
              How can I help you today?
            </h2>
            <p className="text-[15px] text-[#71717a] max-w-sm leading-relaxed">
              I can manage users, reset passwords, enable or disable accounts, and automate IT tasks.
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {["Reset password for john@company.com", "Disable bob@company.com", "View all users"].map(
                (s) => (
                  <div
                    key={s}
                    className="text-[13px] text-[#a1a1aa] bg-[#18181b] border border-white/[0.06] rounded-xl px-3.5 py-2 hover:border-white/10 hover:text-[#d4d4d8] transition-all cursor-default"
                  >
                    {s}
                  </div>
                )
              )}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              message={msg}
              onRetry={onRetry}
              onUpdate={(updated) => onMessageUpdate(idx, updated)}
              isLast={idx === messages.length - 1}
            />
          ))
        )}

        {/* Live step indicator — replaces, never stacks */}
        {isRunning && <StepIndicator step={currentStep} />}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
