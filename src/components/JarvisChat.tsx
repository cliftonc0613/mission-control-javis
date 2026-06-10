"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Minimal Web Speech API typings (not in lib.dom for all TS configs)
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, new () => SpeechRecognitionLike>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function JarvisChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Systems online. All telemetry nominal. How may I assist you, sir?",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages([
          ...history,
          { role: "assistant", content: assistantText },
        ]);
      }
    } catch (err) {
      setMessages([
        ...history,
        {
          role: "assistant",
          content: `[LINK FAILURE] ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  function startListening() {
    if (listening || streaming) return;
    const recognition = getSpeechRecognition();
    if (!recognition) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Voice input is unavailable in this browser, sir. Chrome or Edge recommended.",
        },
      ]);
      return;
    }
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    let transcript = "";
    recognition.onresult = (event) => {
      transcript = Array.from(
        { length: event.results.length },
        (_, i) => event.results[i][0].transcript
      ).join(" ");
      setInput(transcript);
    };
    recognition.onend = () => {
      setListening(false);
      if (transcript.trim()) send(transcript);
    };
    recognition.onerror = () => setListening(false);

    recognition.start();
    setListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0 text-[13px] leading-relaxed"
      >
        {messages.map((msg, i) => (
          <div key={i}>
            <span
              className={
                msg.role === "assistant"
                  ? "text-hud-orange text-glow font-bold"
                  : "text-glow-white font-bold"
              }
            >
              {msg.role === "assistant" ? "JARVIS" : "CLIFTON"} ▸{" "}
            </span>
            <span
              className={
                msg.role === "assistant" ? "text-hud-orange/90" : "text-white/90"
              }
            >
              {msg.content}
              {msg.role === "assistant" &&
                streaming &&
                i === messages.length - 1 && (
                  <span className="animate-pulse">▊</span>
                )}
            </span>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2 border-t border-hud-orange/30 pt-3"
      >
        <button
          type="button"
          onMouseDown={startListening}
          onMouseUp={stopListening}
          onMouseLeave={stopListening}
          onTouchStart={(e) => {
            e.preventDefault();
            startListening();
          }}
          onTouchEnd={stopListening}
          title="Hold to speak"
          className={`shrink-0 w-10 h-10 border border-hud-orange/60 text-hud-orange hover:bg-hud-orange/10 transition-colors ${
            listening ? "mic-active bg-hud-orange/20" : ""
          }`}
        >
          {listening ? "●" : "🎙"}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? "LISTENING…" : "COMMAND INPUT…"}
          className="flex-1 bg-transparent border border-hud-orange/40 px-3 py-2 text-sm text-white placeholder:text-hud-orange/40 focus:outline-none focus:border-hud-orange focus:shadow-[0_0_10px_rgba(246,102,2,0.4)]"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="shrink-0 px-4 border border-hud-orange/60 text-hud-orange font-bold tracking-widest text-xs hover:bg-hud-orange/10 disabled:opacity-30 transition-colors"
        >
          SEND
        </button>
      </form>
    </div>
  );
}
