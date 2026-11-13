import "./style.css";
import { Stage } from "./visual/Stage";
import { AudioEngine } from "./audio/AudioEngine";
import { PlaylistPlayer } from "./audio/PlaylistPlayer";
import { AudioVisualizer } from "./visual/AudioVisualizer";
import { bindControls } from "./ui/controls";
import { bindKeyboard } from "./ui/input";
import { bindDropzone } from "./ui/dropzone";
import { bindPlaylistPanel } from "./ui/PlaylistPanel";
import { computeRms } from "./audio/dsp";

function mustElement<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`missing ${selector}`);
  return el;
}

const app = mustElement<HTMLDivElement>("#app");
const hud = mustElement<HTMLDivElement>("#hud");

const stage = new Stage(app);
const engine = new AudioEngine();
const player = new PlaylistPlayer(engine);
const visualizer = new AudioVisualizer({
  sampleRate: engine.sampleRate,
  fftSize: engine.analyser.fftSize,
});
stage.scene.add(visualizer.object);

const panel = bindPlaylistPanel(player);
const controls = bindControls(player);
const unbindKeys = bindKeyboard(engine, {
  onMode: (mode) => {
    visualizer.setMode(mode);
  },
  onNext: () => {
    void player.next();
  },
  onPrev: () => {
    void player.prev();
  },
  onTogglePlaylist: () => {
    panel.toggle();
  },
});
const unbindDrop = bindDropzone((files) => {
  // drop 是用户手势，先同步恢复上下文，避免解码后才 resume 被拦截
  void player.unlock();
  player.addFiles(files);
});

// 预分配，每帧复用
const timeBuf = new Float32Array(engine.analyser.fftSize);
const freqBuf = new Float32Array(engine.analyser.frequencyBinCount);

const clock = { last: performance.now(), fps: 0 };

function frame(now: number): void {
  const dt = Math.min((now - clock.last) / 1000, 0.1);
  clock.last = now;
  if (dt > 0) clock.fps = clock.fps * 0.9 + (1 / dt) * 0.1;

  engine.analyser.getFloatTimeDomainData(timeBuf);
  engine.analyser.getFloatFrequencyData(freqBuf);

  visualizer.update({
    time: timeBuf,
    freq: freqBuf,
    dt,
    viewWidth: stage.viewWidth,
    widthPx: stage.width,
    heightPx: stage.height,
  });

  const s = player.snapshot();
  const track = s.count > 0 ? `${s.index + 1}/${s.count}` : "-";
  panel.render(s);

  hud.textContent =
    `stage ${stage.width}x${stage.height}\n` +
    `fps   ${clock.fps.toFixed(1)}\n` +
    `ctx   ${s.ctxState}\n` +
    `mode  ${visualizer.currentMode}\n` +
    `rms   ${computeRms(timeBuf).toFixed(4)}\n` +
    `track ${track}\n` +
    `gain  ${s.gain.toFixed(2)}`;

  controls.render(s);
  stage.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unbindDrop();
    unbindKeys();
    panel.dispose();
    controls.dispose();
    player.dispose();
    visualizer.dispose();
    engine.dispose();
    stage.dispose();
  });
}

if (import.meta.env.DEV) {
  (
    window as unknown as {
      __app: {
        engine: AudioEngine;
        player: PlaylistPlayer;
        visualizer: AudioVisualizer;
      };
    }
  ).__app = { engine, player, visualizer };
}
