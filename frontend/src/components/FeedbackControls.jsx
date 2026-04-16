/**
 * FeedbackControls.jsx
 *
 * Minimal 👍 👎 buttons rendered below result cards.
 * ChatGPT-style: low opacity at rest, full on hover.
 */

export default function FeedbackControls({ message, onUpdate }) {
  const voted = !!message.feedback;

  async function handleFeedback(type) {
    if (voted) return;

    // Optimistic local update
    onUpdate({ ...message, feedback: type });

    if (type === "down") {
      // Fire-and-forget to backend
      try {
        await fetch("https://decawork-assignment.onrender.com/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: message.task || "",
            feedback: type,
            old_result: message.result ?? {},
          }),
        });
      } catch {
        /* non-critical */
      }
    }
  }

  const iconClass = (type) => {
    const active = message.feedback === type;
    if (active) return "text-emerald-400 opacity-100";
    if (voted) return "text-[#27272a] opacity-40 cursor-default";
    return "text-[#3f3f46] opacity-60 hover:opacity-100 hover:text-[#a1a1aa] transition-all duration-150";
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleFeedback("up")}
        disabled={voted}
        title="Good response"
        aria-label="Thumbs up"
        className={`p-1 rounded-md ${iconClass("up")} ${!voted ? "hover:bg-white/[0.04]" : ""}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M1 8.25a1.25 1.25 0 1 1 2.5 0v5.5a1.25 1.25 0 0 1-2.5 0v-5.5ZM9 3V1.7c0-.268.14-.526.395-.607A2 2 0 0 1 12 3c0 .995-.182 1.948-.514 2.826-.204.54.166 1.174.744 1.174h2.52c1.243 0 2.261 1.01 2.146 2.247a23.864 23.864 0 0 1-1.341 5.974C15.153 16.323 14.072 17 12.9 17H6.171a2 2 0 0 1-1.179-.387L2 14.5V8.5l3.82-3.283A2 2 0 0 1 7 4.83l.405-.405A2 2 0 0 1 9 3Z" />
        </svg>
      </button>

      <button
        onClick={() => handleFeedback("down")}
        disabled={voted}
        title="Poor response"
        aria-label="Thumbs down"
        className={`p-1 rounded-md ${iconClass("down")} ${!voted ? "hover:bg-white/[0.04]" : ""}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M15 7.75a1.25 1.25 0 1 1-2.5 0v-5.5a1.25 1.25 0 0 1 2.5 0v5.5ZM7 13v1.3c0 .268-.14.526-.395.607A2 2 0 0 1 4 13c0-.995.182-1.948.514-2.826.204-.54-.166-1.174-.744-1.174H1.25C.007 9-.011 7.99.104 6.753A23.864 23.864 0 0 1 1.445.779C1.847-.323 2.928-1 4.1-1h6.728a2 2 0 0 1 1.179.387L15 1.5v6l-3.82 3.283A2 2 0 0 1 10 11.17l-.405.405A2 2 0 0 1 7 13Z" />
        </svg>
      </button>
    </div>
  );
}
