import type { AudioEngine } from "../audio/AudioEngine";
import type { VisualMode } from "../visual/AudioVisualizer";

export type KeyboardOptions = {
  onMode?: (mode: VisualMode) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onTogglePlaylist?: () => void;
  onToggleFullscreen?: () => void;
};

export function bindKeyboard(
  engine: AudioEngine,
  options: KeyboardOptions = {},
): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;

    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;

    switch (e.code) {
      case "Space":
        e.preventDefault();
        void engine.toggle();
        break;
      case "Comma":
      case "ArrowLeft":
        engine.seekBy(-5);
        break;
      case "Period":
      case "ArrowRight":
        engine.seekBy(5);
        break;
      case "Minus":
      case "NumpadSubtract":
        engine.changeGain(-0.05);
        break;
      case "Equal":
      case "NumpadAdd":
        engine.changeGain(0.05);
        break;
      case "Digit1":
      case "Numpad1":
        options.onMode?.("spectrum");
        break;
      case "Digit2":
      case "Numpad2":
        options.onMode?.("waveform");
        break;
      case "KeyN":
        options.onNext?.();
        break;
      case "KeyP":
        options.onPrev?.();
        break;
      case "KeyL":
        options.onTogglePlaylist?.();
        break;
      case "KeyF":
        options.onToggleFullscreen?.();
        break;
      default:
        break;
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}
