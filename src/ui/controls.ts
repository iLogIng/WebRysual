import type { PlayerSnapshot, PlaylistPlayer } from "../audio/PlaylistPlayer";

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

function fmt(sec: number): string {
  if (!Number.isFinite(sec)) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type Controls = {
  render(s: PlayerSnapshot): void;
  dispose(): void;
};

// 控制栏绑定 只调用 PlaylistPlayer 的公开方法
export function bindControls(player: PlaylistPlayer): Controls {
  const fileInput = must<HTMLInputElement>("file");
  const btnLoad = must<HTMLButtonElement>("btn-load");
  const btnPrev = must<HTMLButtonElement>("btn-prev");
  const btnBack = must<HTMLButtonElement>("btn-back");
  const btnPlay = must<HTMLButtonElement>("btn-play");
  const btnFwd = must<HTMLButtonElement>("btn-fwd");
  const btnNext = must<HTMLButtonElement>("btn-next");
  const btnVolDown = must<HTMLButtonElement>("btn-vol-down");
  const btnVolUp = must<HTMLButtonElement>("btn-vol-up");
  const trackEl = must<HTMLSpanElement>("track");
  const timeEl = must<HTMLSpanElement>("time");

  const onLoad = (): void => {
    void player.unlock(); // 在同步的手势调用栈中恢复上下文
    fileInput.click();
  };

  const onChange = (): void => {
    // FileList 是 array-like，先转数组再清空
    const files = Array.from(fileInput.files ?? []);
    fileInput.value = "";
    if (files.length === 0) return;

    player.addFiles(files);
  };

  const onPlay = (): void => {
    void player.toggle();
  };
  const onPrev = (): void => {
    void player.prev();
  };
  const onNext = (): void => {
    void player.next();
  };
  const onBack = (): void => {
    player.seekBy(-5);
  };
  const onFwd = (): void => {
    player.seekBy(5);
  };
  const onVolDown = (): void => {
    player.changeGain(-0.05);
  };
  const onVolUp = (): void => {
    player.changeGain(0.05);
  };

  btnLoad.addEventListener("click", onLoad);
  btnPrev.addEventListener("click", onPrev);
  btnPlay.addEventListener("click", onPlay);
  btnNext.addEventListener("click", onNext);
  btnBack.addEventListener("click", onBack);
  btnFwd.addEventListener("click", onFwd);
  btnVolDown.addEventListener("click", onVolDown);
  btnVolUp.addEventListener("click", onVolUp);
  fileInput.addEventListener("change", onChange);

  // 只在文本变化时写 DOM
  let trackText = "";
  function setTrack(text: string): void {
    if (text === trackText) return;
    trackText = text;
    trackEl.textContent = text;
  }

  let lastPaint = 0;
  return {
    render(s: PlayerSnapshot): void {
      const loaded = s.trackName !== null;
      const hasList = s.count > 0;

      btnPlay.textContent = s.playing ? "暂停" : "播放";
      btnPlay.disabled = !loaded;
      btnBack.disabled = !loaded;
      btnFwd.disabled = !loaded;
      btnPrev.disabled = !hasList;
      btnNext.disabled = !hasList;

      if (s.loading) {
        setTrack(`${s.index + 1}/${s.count} 解码中…`);
      } else if (s.trackName) {
        setTrack(`${s.index + 1}/${s.count} ${s.trackName}`);
      } else {
        setTrack("未加载");
      }

      const now = performance.now();
      if (now - lastPaint >= 100) {
        // 时间文本 10Hz 足够
        lastPaint = now;
        timeEl.textContent = `${fmt(s.currentTime)} / ${fmt(s.duration)}`;
      }
    },
    dispose(): void {
      btnLoad.removeEventListener("click", onLoad);
      btnPrev.removeEventListener("click", onPrev);
      btnPlay.removeEventListener("click", onPlay);
      btnNext.removeEventListener("click", onNext);
      btnBack.removeEventListener("click", onBack);
      btnFwd.removeEventListener("click", onFwd);
      btnVolDown.removeEventListener("click", onVolDown);
      btnVolUp.removeEventListener("click", onVolUp);
      fileInput.removeEventListener("change", onChange);
    },
  };
}
