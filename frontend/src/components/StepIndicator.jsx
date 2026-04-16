/**
 * StepIndicator.jsx
 *
 * Shows ONE current step at a time with a pulsing dot + smooth text transition.
 * Replaces stacked progress logs — only the latest step is visible.
 */

import { useState, useEffect } from "react";

export default function StepIndicator({ step }) {
  const [displayed, setDisplayed] = useState(step || "Thinking...");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (step && step !== displayed) {
      setFading(true);
      const t = setTimeout(() => {
        setDisplayed(step);
        setFading(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [step, displayed]);

  return (
    <div className="flex items-center gap-3.5 animate-[fadeIn_0.3s_ease-out]">
      {/* AI avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
        <span className="text-white text-[10px] font-bold">AI</span>
      </div>

      {/* Step text with pulse */}
      <div className="flex items-center gap-2.5 bg-[#18181b] border border-white/[0.06] rounded-2xl px-4 py-3 shadow-sm">
        {/* Pulsing dot */}
        <div className="relative flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <div className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>

        <span
          className={`text-[13px] text-[#a1a1aa] font-medium tracking-tight transition-all duration-200 ${
            fading ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
          }`}
        >
          {displayed}
        </span>
      </div>
    </div>
  );
}
