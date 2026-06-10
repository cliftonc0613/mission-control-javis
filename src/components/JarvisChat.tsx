"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type Provider = "anthropic" | "openai" | "openrouter";

interface ProviderInfo {
  id: Provider;
  model: string;
  configured: boolean;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "CLAUDE",
  openai: "CHATGPT",
  openrouter: "OPENROUTER",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type VoiceMode = "off" | "system" | "clone";

const VOICE_MODE_LABELS: Record<VoiceMode, string> = {
  off: "OFF",
  system: "SYSTEM",
  clone: "CLIFTON CLONE",
};

/** strip markdown/code noise so TTS reads cleanly */
function toSpeakable(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " code block omitted. ")
    .replace(/[*_#`>|]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
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
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [openRouterModel, setOpenRouterModel] = useState("");
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("off");
  const [synthesizing, setSynthesizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voicebox (local voice clone) availability
  const { data: voiceboxData } = useSWR<{
    online: boolean;
    defaultProfileId: string | null;
  }>("/api/speak", fetcher, { refreshInterval: 60000 });
  const voiceboxOnline = voiceboxData?.online ?? false;

  const { data: providerData } = useSWR<{ providers: ProviderInfo[] }>(
    "/api/jarvis",
    fetcher
  );
  const providers = providerData?.providers ?? [];
  const activeInfo = providers.find((p) => p.id === provider);

  // fetch the OpenRouter catalog only while OpenRouter is selected
  const { data: catalogData } = useSWR<{
    models: { id: string; name: string }[];
  }>(provider === "openrouter" ? "/api/jarvis/models" : null, fetcher, {
    revalidateOnFocus: false,
  });
  const catalog = catalogData?.models ?? [];

  // restore last-used provider + OpenRouter model
  useEffect(() => {
    const saved = localStorage.getItem("jarvis-provider") as Provider | null;
    if (saved && saved in PROVIDER_LABELS) setProvider(saved);
    const savedModel = localStorage.getItem("jarvis-openrouter-model");
    if (savedModel) setOpenRouterModel(savedModel);
    const savedVoice = localStorage.getItem("jarvis-voice-mode") as VoiceMode | null;
    if (savedVoice && savedVoice in VOICE_MODE_LABELS) setVoiceMode(savedVoice);
  }, []);

  function selectProvider(next: Provider) {
    setProvider(next);
    localStorage.setItem("jarvis-provider", next);
  }

  function selectOpenRouterModel(next: string) {
    setOpenRouterModel(next);
    localStorage.setItem("jarvis-openrouter-model", next);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }

  async function speak(text: string) {
    const speakable = toSpeakable(text);
    if (!speakable || voiceMode === "off") return;
    stopSpeaking();

    if (voiceMode === "system") {
      const utterance = new SpeechSynthesisUtterance(speakable);
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.name.includes("Daniel")) ??
        voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
      return;
    }

    // clone mode — synthesize with Voicebox (can take a while)
    setSynthesizing(true);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: speakable }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(audio.src);
      await audio.play();
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `[VOICE SYNTH OFFLINE] ${err instanceof Error ? err.message : "unknown"}`,
        },
      ]);
    } finally {
      setSynthesizing(false);
    }
  }

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
        body: JSON.stringify({
          messages: history,
          provider,
          ...(provider === "openrouter" && openRouterModel
            ? { model: openRouterModel }
            : {}),
        }),
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

      if (assistantText) void speak(assistantText);
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
      {/* ── Provider selector ───────────────────────────── */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        <span className="text-[9px] tracking-[0.3em] text-hud-orange/50 mr-1">
          AI CORE:
        </span>
        {(Object.keys(PROVIDER_LABELS) as Provider[]).map((id) => {
          const info = providers.find((p) => p.id === id);
          const active = provider === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectProvider(id)}
              title={
                info
                  ? `${info.model}${info.configured ? "" : " — API key missing"}`
                  : id
              }
              className={`px-2 py-1 text-[9px] tracking-widest border transition-colors ${
                active
                  ? "border-hud-orange bg-hud-orange/15 text-hud-orange text-glow font-bold"
                  : "border-hud-orange/30 text-hud-orange/50 hover:border-hud-orange/60 hover:text-hud-orange/80"
              }`}
            >
              {PROVIDER_LABELS[id]}
              <span
                className={`ml-1 ${
                  info?.configured ? "text-glow-white" : "text-hud-orange/30"
                }`}
              >
                {info?.configured ? "●" : "○"}
              </span>
            </button>
          );
        })}
        <span className="text-[9px] tracking-[0.3em] text-hud-orange/50 ml-2">
          VOICE:
        </span>
        {(["off", "system", "clone"] as VoiceMode[]).map((mode) => {
          const disabled = mode === "clone" && !voiceboxOnline;
          const active = voiceMode === mode;
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() => {
                setVoiceMode(mode);
                localStorage.setItem("jarvis-voice-mode", mode);
                stopSpeaking();
              }}
              title={
                mode === "clone"
                  ? disabled
                    ? "Launch the Voicebox app to enable your cloned voice"
                    : "Jarvis speaks with your Voicebox cloned voice (~15s synth per reply)"
                  : mode === "system"
                    ? "Jarvis speaks instantly with the browser voice"
                    : "Voice replies disabled"
              }
              className={`px-2 py-1 text-[9px] tracking-widest border transition-colors ${
                active
                  ? "border-hud-orange bg-hud-orange/15 text-hud-orange text-glow font-bold"
                  : "border-hud-orange/30 text-hud-orange/50 hover:border-hud-orange/60 hover:text-hud-orange/80"
              } ${disabled ? "opacity-30 cursor-not-allowed" : ""} ${
                synthesizing && active ? "mic-active" : ""
              }`}
            >
              {synthesizing && active ? "SYNTH…" : VOICE_MODE_LABELS[mode]}
            </button>
          );
        })}
        {provider === "openrouter" ? (
          <select
            value={openRouterModel || activeInfo?.model || ""}
            onChange={(e) => selectOpenRouterModel(e.target.value)}
            className="ml-1 max-w-[45%] bg-hud-bg border border-hud-orange/40 text-hud-orange text-[9px] tracking-wider px-1 py-1 focus:outline-none focus:border-hud-orange focus:shadow-[0_0_8px_rgba(246,102,2,0.4)] cursor-pointer"
            title="Pick any OpenRouter model"
          >
            {catalog.length === 0 && (
              <option value={activeInfo?.model ?? ""}>
                {activeInfo?.model ?? "loading catalog…"}
              </option>
            )}
            {catalog.map((m) => (
              <option key={m.id} value={m.id} className="bg-hud-bg">
                {m.id}
              </option>
            ))}
          </select>
        ) : (
          activeInfo && (
            <span className="text-[9px] text-hud-orange/40 ml-auto truncate max-w-[40%]">
              {activeInfo.model}
            </span>
          )
        )}
      </div>

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
