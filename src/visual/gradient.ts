import * as THREE from "three";

// 渐变配置
// （用户/配置文件层）
export type GradientStop = {
  at: number; // 0..1
  color: string; // #rrggbb
};

export type GradientConfig = {
  stops: GradientStop[];
};

// 运行时采样结果
// （sRGB HSL，0..1）
export type Hsl = { h: number; s: number; l: number };

type PreparedStop = { at: number; h: number; s: number; l: number };

export type PreparedGradient = {
  stops: PreparedStop[];
};

// 默认值保持旧版观感
// Spectrum: hsl(222, 100%, 50%) -> hsl(342, 100%, 50%)
// Waveform: hsl(187, 100%, 80%) -> hsl(307, 100%, 80%)
export const DEFAULT_SPECTRUM_GRADIENT: GradientConfig = {
  stops: [
    { at: 0, color: "#004dff" },
    { at: 1, color: "#ff004c" },
  ],
};

export const DEFAULT_WAVEFORM_GRADIENT: GradientConfig = {
  stops: [
    { at: 0, color: "#99f3ff" },
    { at: 1, color: "#ff99f3" },
  ],
};

const tmpColor = new THREE.Color();
const tmpHsl: Hsl = { h: 0, s: 0, l: 0 };

// hex -> sRGB HSL，按 at 排序
export function prepareGradient(config: GradientConfig): PreparedGradient {
  const stops: PreparedStop[] = [];

  for (const stop of config.stops) {
    if (!Number.isFinite(stop.at)) continue;

    tmpColor.set(stop.color);
    tmpColor.getHSL(tmpHsl, THREE.SRGBColorSpace);

    stops.push({
      at: Math.min(1, Math.max(0, stop.at)),
      h: tmpHsl.h,
      s: tmpHsl.s,
      l: tmpHsl.l,
    });
  }

  stops.sort((a, b) => a.at - b.at);

  // 至少一个有效 stop
  if (stops.length === 0) {
    stops.push({ at: 0, h: 0, s: 0, l: 1 });
  }

  return { stops };
}

// 在 sRGB HSL 空间采样，hue 走最短路径
export function sampleGradientHsl(
  gradient: PreparedGradient,
  t: number,
  out: Hsl,
): Hsl {
  const stops = gradient.stops;

  if (stops.length === 1) {
    out.h = stops[0].h;
    out.s = stops[0].s;
    out.l = stops[0].l;
    return out;
  }

  const x = Math.min(1, Math.max(0, t));

  if (x <= stops[0].at) {
    out.h = stops[0].h;
    out.s = stops[0].s;
    out.l = stops[0].l;
    return out;
  }

  const last = stops[stops.length - 1];
  if (x >= last.at) {
    out.h = last.h;
    out.s = last.s;
    out.l = last.l;
    return out;
  }

  let i = 0;
  while (i < stops.length - 1 && x > stops[i + 1].at) i++;

  const a = stops[i];
  const b = stops[i + 1];
  const span = b.at - a.at;
  const u = span <= 1e-6 ? 0 : (x - a.at) / span;

  out.h = lerpHue(a.h, b.h, u);
  out.s = a.s + (b.s - a.s) * u;
  out.l = a.l + (b.l - a.l) * u;
  return out;
}

function lerpHue(a: number, b: number, t: number): number {
  let delta = b - a;

  if (delta > 0.5) delta -= 1;
  else if (delta < -0.5) delta += 1;

  let h = a + delta * t;
  if (h < 0) h += 1;
  if (h >= 1) h -= 1;
  return h;
}
