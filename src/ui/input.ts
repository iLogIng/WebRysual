import type { AudioEngine } from "../audio/AudioEngine";

export function bindKeyboard(engine: AudioEngine): () => void {
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
      default:
        break;
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}
