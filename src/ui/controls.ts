import type { AudioEngine, EngineSnapshot } from "../audio/AudioEngine";

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`mission #${id}`);
  return el as T;
}

function fmt(sec: number): string {
  if (!Number.isFinite(sec)) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type Controls = {
  render(s: EngineSnapshot): void;
  dispose(): void;
};

// 控制器绑定
export function bindControls(engine: AudioEngine): Controls {
  const fileInput = must<HTMLInputElement>("file");
  const btnLoad = must<HTMLButtonElement>("btn-load");
  const btnBack = must<HTMLButtonElement>("btn-back");
  const btnPlay = must<HTMLButtonElement>("btn-play");
  const btnFwd = must<HTMLButtonElement>("btn-fwd");
  const btnVolDown = must<HTMLButtonElement>("btn-vol-down");
  const btnVolUp = must<HTMLButtonElement>("btn-vol-up");
  const trackEl = must<HTMLSpanElement>("track");
  const timeEl = must<HTMLSpanElement>("time");

  const onLoad = (): void => {
    void engine.unlock(); // 在同步的手势调用栈中恢复上下文
    fileInput.click();
  };

  // 更换
  const onChange = async (): Promise<void> => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    setTrack("decoding...");
    try {
      await engine.load(file);
      await engine.play();
    } catch (err) {
      console.error(err);
      setTrack("load failed...");
    }
  };

  const onChangeEvent = (): void => {
    void onChange();
  };

  const onPlay = (): void => {
    void engine.toggle();
  };
  const onBack = (): void => {
    engine.seekBy(-5);
  };
  const onFwd = (): void => {
    engine.seekBy(5);
  };
  const onVolDown = (): void => {
    engine.changeGain(-0.05);
  };
  const onVolUp = (): void => {
    engine.changeGain(0.05);
  };

  btnLoad.addEventListener("click", onLoad);
  btnPlay.addEventListener("click", onPlay);
  btnBack.addEventListener("click", onBack);
  btnFwd.addEventListener("click", onFwd);
  btnVolDown.addEventListener("click", onVolDown);
  btnVolUp.addEventListener("click", onVolUp);
  fileInput.addEventListener("change", onChangeEvent);

  // 只在文本变化时写 DOM
  let trackText = "";
  function setTrack(text: string): void {
    if (text === trackText) return;
    trackText = text;
    trackEl.textContent = text;
  }

  let lastPaint = 0;
  return {
    render(s: EngineSnapshot): void {
      btnPlay.textContent = s.playing ? "暂停" : "播放";

      const loaded = s.trackName !== null;
      btnPlay.disabled = !loaded;
      btnBack.disabled = !loaded;
      btnFwd.disabled = !loaded;

      if (s.trackName) setTrack(s.trackName);

      const now = performance.now();
      if (now - lastPaint >= 100) {
        // 时间文本 10Hz 足够
        lastPaint = now;
        timeEl.textContent = `${fmt(s.currentTime)} / ${fmt(s.duration)}`;
      }
    },
    dispose(): void {
      btnLoad.removeEventListener("click", onLoad);
      btnPlay.removeEventListener("click", onPlay);
      btnBack.removeEventListener("click", onBack);
      btnFwd.removeEventListener("click", onFwd);
      btnVolDown.removeEventListener("click", onVolDown);
      btnVolUp.removeEventListener("click", onVolUp);
      fileInput.removeEventListener("change", onChangeEvent);
    },
  };
}
