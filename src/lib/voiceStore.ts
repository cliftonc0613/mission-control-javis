// Tiny shared store linking JarvisChat (speech producer) to ArcReactor
// (visualizer) without prop-drilling through the page layout.

export interface VoiceState {
  speaking: boolean;
  /** 0..1 live audio amplitude */
  level: number;
}

let state: VoiceState = { speaking: false, level: 0 };
const listeners = new Set<() => void>();

export const voiceStore: {
  get(): VoiceState;
  set(partial: Partial<VoiceState>): void;
  subscribe(listener: () => void): () => void;
} = {
  get(): VoiceState {
    return state;
  },
  set(partial: Partial<VoiceState>) {
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// dev convenience: drive the reactor from the browser console
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__voiceStore = voiceStore;
}
