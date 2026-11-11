import './style.css';
import * as THREE from 'three';
import { Stage } from './visual/Stage';

const app = document.querySelector<HTMLDivElement>('#app');
const hud = document.querySelector<HTMLDivElement>('#hud');
if (!app || !hud)
  throw new Error('missiog dom')

const stage = new Stage(app)

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({color: 0x66ccff}),
);
stage.scene.add(cube);

const clock = { last: performance.now(), fps: 0 };

function frame(now: number): void {
  const dt = Math.min((now - clock.last) / 1000, 0.1);
  clock.last = now;
  if (dt > 0)
    clock.fps = clock.fps * 0.9 + (1 / dt) * 0.1;
  
  cube.rotation.x += dt * 0.6;
  cube.rotation.y += dt * 0.9;
  
  stage.render();

  if (hud == null)
    throw new Error("hud cannot be null")
  hud.textContent = `fps  ${clock.fps.toFixed(2)}\n` +
                     `size ${stage.width}x${stage.height}\n` +
                     `dpr  ${window.devicePixelRatio}`;
  
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stage.dispose();
    cube.geometry.dispose();
    (cube.material as THREE.MeshBasicMaterial).dispose();
  });
}


