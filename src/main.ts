import "./style.css";
import { Stage } from "./visual/Stage";
import { AudioEngine } from "./audio/AudioEngine";
import { bindControls } from "./ui/controls";
import { bindKeyboard } from "./ui/input";
import { Waveform } from "./visual/modes/Waveform";

const app = document.querySelector<HTMLDivElement>("#app");
const hud = document.querySelector<HTMLDivElement>("#hud");
if (!app || !hud) throw new Error("missing dom");

const stage = new Stage(app);
const engine = new AudioEngine();
const controls = bindControls(engine);
const unbindKeys = bindKeyboard(engine);

const waveform = new Waveform();
stage.scene.add(waveform.object);

// 预分配，每帧复用
const timeBuf = new Float32Array(engine.analyser.fftSize);

const clock = { last: performance.now(), fps: 0 };

function frame(now: number): void {
  const dt = Math.min((now - clock.last) / 1000, 0.1);
  clock.last = now;
  if (dt > 0) clock.fps = clock.fps * 0.9 + (1 / dt) * 0.1;

  engine.analyser.getFloatTimeDomainData(timeBuf);
  waveform.update(timeBuf, stage.viewWidth);
  waveform.setViewport(stage.width, stage.height);

  const s = engine.snapshot();
  if (hud == null) throw new Error("hud cannot be null");
  hud.textContent =
    `fps  ${clock.fps.toFixed(1)}\n` +
    `ctx  ${s.ctxState}\n` +
    `sr   ${engine.sampleRate}\n` +
    `rms  ${waveform.rms.toFixed(4)}\n` +
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
    waveform.dispose();
    engine.dispose();
    stage.dispose();
  });
}
