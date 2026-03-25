import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { useLocation } from "wouter";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  buttons?: string[] | null;
}

export default function Chat() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState(1);
  const [sessionComplete, setSessionComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load existing messages on mount
  useEffect(() => {
    async function load() {
      try {
        const [sessionRes, messagesRes] = await Promise.all([
          fetch(`/api/v1/sessions/${sessionId}`),
          fetch(`/api/v1/sessions/${sessionId}/messages`),
        ]);
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          setPhase(session.current_phase ?? session.currentPhase ?? 1);
        }
        if (messagesRes.ok) {
          const data = await messagesRes.json();
          setMessages(
            data.map((m: Record<string, unknown>) => ({
              id: m.id as string,
              role: m.role as "user" | "assistant",
              content: m.content as string,
              buttons: (m.metadata as Record<string, unknown>)?.button_options as string[] | null,
            }))
          );
        }
      } catch {
        // ignore
      }

      // If no messages, send initial "start" to get AI greeting
      const res = await fetch(`/api/v1/sessions/${sessionId}/messages`);
      const data = await res.json();
      if (data.length === 0) {
        await sendMessage("Hello");
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function sendMessage(content: string, messageType = "text", metadata: Record<string, unknown> = {}) {
    if (!content.trim()) return;
    setSending(true);

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: content.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          message_type: messageType,
          metadata,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.assistant_message.content,
        buttons: data.assistant_message.buttons,
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (data.session_complete) {
        setSessionComplete(true);
        setPhase((p) => p + 1);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: "Having trouble connecting. Try again." },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleButtonClick(value: string) {
    sendMessage(value, "button_response", { selected_option: value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  const phaseLabels = ["", "Session 1: Reactions", "Session 2: Stories", "Session 3: Mirror Test"];

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-forge-700">TwinForge</h2>
          <p className="text-xs text-gray-400">{phaseLabels[phase] ?? "Complete"}</p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((p) => (
            <div
              key={p}
              className={`h-2 w-8 rounded-full ${
                p < phase ? "bg-forge-500" : p === phase ? "bg-forge-300" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-lg space-y-3">
          {messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-br-md bg-forge-600 text-white"
                      : "rounded-bl-md bg-white text-gray-800 shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
              {/* Buttons */}
              {msg.role === "assistant" && msg.buttons && msg.buttons.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 pl-1">
                  {msg.buttons.map((btn) => (
                    <button
                      key={btn}
                      onClick={() => handleButtonClick(btn)}
                      disabled={sending}
                      className="rounded-full border border-forge-300 bg-white px-4 py-1.5 text-xs font-medium text-forge-700 transition-colors hover:bg-forge-50 active:bg-forge-100 disabled:opacity-50"
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-300" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {/* Session complete banner */}
          {sessionComplete && (
            <div className="rounded-xl bg-forge-50 p-4 text-center">
              <p className="text-sm font-medium text-forge-700">
                {phase <= 3
                  ? `Ready for ${phaseLabels[phase]}?`
                  : "All sessions complete!"}
              </p>
              {phase <= 3 ? (
                <button
                  onClick={() => {
                    setSessionComplete(false);
                    sendMessage("I'm ready for the next session");
                  }}
                  className="mt-2 rounded-lg bg-forge-600 px-6 py-2 text-sm font-medium text-white hover:bg-forge-700"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/s/${sessionId}/dashboard`)}
                  className="mt-2 rounded-lg bg-forge-600 px-6 py-2 text-sm font-medium text-white hover:bg-forge-700"
                >
                  View Your Soul Package
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="border-t bg-white px-4 py-3 safe-bottom"
      >
        <div className="mx-auto flex max-w-lg gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-forge-400 focus:bg-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-forge-600 text-white transition-colors hover:bg-forge-700 disabled:opacity-40"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
