import "./style.css";
import { Stage } from "./visual/Stage";
import { AudioEngine } from "./audio/AudioEngine";
import { AudioVisualizer } from "./visual/AudioVisualizer";
import { bindControls } from "./ui/controls";
import { bindKeyboard } from "./ui/input";
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
const visualizer = new AudioVisualizer({
  sampleRate: engine.sampleRate,
  fftSize: engine.analyser.fftSize,
});
stage.scene.add(visualizer.object);

const controls = bindControls(engine);
const unbindKeys = bindKeyboard(engine, {
  onMode: (mode) => {
    visualizer.setMode(mode);
  },
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

  const s = engine.snapshot();
  hud.textContent =
    `fps  ${clock.fps.toFixed(1)}\n` +
    `ctx  ${s.ctxState}\n` +
    `mode ${visualizer.currentMode}\n` +
    `rms  ${computeRms(timeBuf).toFixed(4)}\n` +
    `gain ${s.gain.toFixed(2)}`;

  controls.render(s);
  stage.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unbindKeys();
    controls.dispose();
    visualizer.dispose();
    engine.dispose();
    stage.dispose();
  });
}

if (import.meta.env.DEV) {
  (
    window as unknown as {
      __app: { engine: AudioEngine; visualizer: AudioVisualizer };
    }
  ).__app = { engine, visualizer };
}
