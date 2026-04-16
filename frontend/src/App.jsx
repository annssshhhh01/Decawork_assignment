import { useState, useEffect, useRef, useCallback } from "react";
import socket from "./socket";
import ChatWindow from "./components/ChatWindow";
import InputBar from "./components/InputBar";

// Progress messages to HIDE (noise from browser-use internals)
const NOISE_PATTERNS = [
  /^🤖\s*Fetch/i,
  /^🤖\s*Python/i,
  /^🤖\s*Bash/i,
  /^🤖\s*Running Python/i,
  /^🤖\s*Running:/i,
  /^🤖\s*Script saved/i,
  /^🤖\s*Now let me/i,
  /^🤖\s*Python failed/i,
  /^🤖\s*Browser Navigate/i,
  /^🤖\s*Navigating to/i,
  /HTTP \d{3}/,
  /scripts\//,
  /\.py/,
  /import\s/,
  /result\s*=\s*await/,
];

// Map noisy progress into clean user-facing steps
function humanizeStep(raw) {
  const t = raw.replace(/^🤖\s*/, "").trim();
  if (/fetch/i.test(t)) return null;
  if (/python|bash|running|script|import|await|result\s*=/i.test(t)) return null;
  if (/navigat/i.test(t)) return "Opening admin panel...";
  if (/search/i.test(t)) return "Searching for user...";
  if (/click.*disable/i.test(t)) return "Disabling account...";
  if (/click.*enable/i.test(t)) return "Enabling account...";
  if (/click.*reset/i.test(t)) return "Resetting password...";
  if (/click.*confirm/i.test(t)) return "Confirming action...";
  if (/banner/i.test(t)) return "Reading result...";
  if (/done/i.test(t) || /success/i.test(t)) return "Finishing up...";
  if (NOISE_PATTERNS.some((p) => p.test(raw))) return null;
  // If it's a clean meaningful message, pass it through
  if (t.length > 10 && t.length < 200) return t;
  return null;
}

// Fake instant steps shown before real backend data arrives
const FAKE_STEPS = [
  { text: "Understanding your request...", delay: 0 },
  { text: "Planning action...", delay: 1200 },
  { text: "Connecting to admin panel...", delay: 3000 },
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [pendingTask, setPendingTask] = useState(null);
  const [lastTask, setLastTask] = useState("");
  const fakeTimers = useRef([]);
  const realStepReceived = useRef(false);

  // Clear fake timers
  const clearFakes = useCallback(() => {
    fakeTimers.current.forEach(clearTimeout);
    fakeTimers.current = [];
  }, []);

  // Start fake instant steps
  const startFakeSteps = useCallback(() => {
    realStepReceived.current = false;
    FAKE_STEPS.forEach(({ text, delay }) => {
      const id = setTimeout(() => {
        if (!realStepReceived.current) {
          setCurrentStep(text);
        }
      }, delay);
      fakeTimers.current.push(id);
    });
  }, []);

  useEffect(() => {
    socket.on("progress", (data) => {
      const cleaned = humanizeStep(data.message || "");
      if (cleaned) {
        realStepReceived.current = true;
        clearFakes();
        setCurrentStep(cleaned);
      }
    });

    socket.on("done", (data) => {
      setIsRunning(false);
      setCurrentStep(null);
      clearFakes();

      let output = "";
      if (typeof data.output === "string") {
        output = data.output;
      } else if (data.result && data.result.output) {
        output = data.result.output;
      } else {
        output = JSON.stringify(data);
      }

      const isError =
        data.status === "error" ||
        output.toLowerCase().includes("error") ||
        output.toLowerCase().includes("not_found");

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          type: isError ? "error" : "result",
          text: output,
          task: lastTask,
          result: data,
        },
      ]);
    });

    socket.on("error", (data) => {
      setIsRunning(false);
      setCurrentStep(null);
      clearFakes();
      setMessages((prev) => [
        ...prev,
        { role: "agent", type: "error", text: data.message || "An error occurred." },
      ]);
    });

    socket.on("confirmation_required", (data) => {
      setIsRunning(false);
      setCurrentStep(null);
      clearFakes();
      setPendingTask(data.task);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          type: "confirm",
          task: data.task,
          onConfirm: () => handleConfirm(data.task),
          onCancel: handleCancel,
        },
      ]);
    });

    return () => {
      socket.off("progress");
      socket.off("done");
      socket.off("error");
      socket.off("confirmation_required");
      clearFakes();
    };
  }, [lastTask, clearFakes]);

  const handleSubmit = (taskText) => {
    setMessages((prev) => [...prev, { role: "user", text: taskText }]);
    setIsRunning(true);
    setLastTask(taskText);
    startFakeSteps();
    socket.emit("run_task", { task: taskText });
  };

  const handleConfirm = (taskText) => {
    setMessages((prev) => [
      ...prev,
      { role: "agent", type: "progress", text: "✅ Confirmation received. Executing..." },
    ]);
    setIsRunning(true);
    setPendingTask(null);
    startFakeSteps();
    socket.emit("run_task", { task: taskText, confirm: true });
  };

  const handleCancel = () => {
    setMessages((prev) => [
      ...prev,
      { role: "agent", type: "error", text: "Action cancelled by user." },
    ]);
    setPendingTask(null);
  };

  const handleRetry = () => {
    if (lastTask) {
      setIsRunning(true);
      setCurrentStep("Retrying task...");
      startFakeSteps();
      socket.emit("run_task", { task: lastTask });
    }
  };

  const handleMessageUpdate = (idx, updatedMsg) => {
    setMessages((prev) => prev.map((m, i) => (i === idx ? updatedMsg : m)));
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#09090b] font-sans text-[#f4f4f5]">
      {/* Header */}
      <header className="h-[56px] shrink-0 flex items-center px-5 md:px-6 sticky top-0 z-10 w-full border-b border-white/[0.04] bg-[#09090b]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-white text-[10px] font-bold tracking-tight">IT</span>
          </div>
          <div className="font-semibold tracking-tight text-[15px]">
            IT Agent
            <span className="text-[#52525b] font-normal ml-2 text-[13px]">v4.0</span>
          </div>
        </div>
      </header>

      {/* Chat */}
      <ChatWindow
        messages={messages}
        isRunning={isRunning}
        currentStep={currentStep}
        onRetry={handleRetry}
        onMessageUpdate={handleMessageUpdate}
      />

      {/* Input */}
      <InputBar onSubmit={handleSubmit} isRunning={isRunning || pendingTask !== null} />
    </div>
  );
}
