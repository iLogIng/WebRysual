import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPECTRUM_GRADIENT,
  DEFAULT_WAVEFORM_GRADIENT,
  prepareGradient,
  sampleGradientHsl,
  type Hsl,
} from "./gradient";

function sampleDefault(
  config: typeof DEFAULT_SPECTRUM_GRADIENT,
  t: number,
): Hsl {
  const out: Hsl = { h: 0, s: 0, l: 0 };
  return sampleGradientHsl(prepareGradient(config), t, out);
}

describe("prepareGradient", () => {
  it("sorts stops and clamps their positions", () => {
    const gradient = prepareGradient({
      stops: [
        { at: 2, color: "#ffffff" },
        { at: -1, color: "#000000" },
      ],
    });

    expect(gradient.stops.map((s) => s.at)).toEqual([0, 1]);
  });

  it("falls back to white for an empty config", () => {
    const gradient = prepareGradient({ stops: [] });
    const out = sampleGradientHsl(gradient, 0.5, { h: 0, s: 0, l: 0 });

    expect(out.s).toBe(0);
    expect(out.l).toBe(1);
  });
});

describe("sampleGradientHsl", () => {
  it("reproduces the default Spectrum hue range", () => {
    const start = sampleDefault(DEFAULT_SPECTRUM_GRADIENT, 0);
    const end = sampleDefault(DEFAULT_SPECTRUM_GRADIENT, 1);

    expect(start.h * 360).toBeCloseTo(222, 0);
    expect(start.s).toBeCloseTo(1, 2);
    expect(start.l).toBeCloseTo(0.5, 2);

    expect(end.h * 360).toBeCloseTo(342, 0);
    expect(end.s).toBeCloseTo(1, 2);
    expect(end.l).toBeCloseTo(0.5, 2);
  });

  it("reproduces the default Waveform hue range", () => {
    const start = sampleDefault(DEFAULT_WAVEFORM_GRADIENT, 0);
    const end = sampleDefault(DEFAULT_WAVEFORM_GRADIENT, 1);

    expect(start.h * 360).toBeCloseTo(187, 0);
    expect(start.l).toBeCloseTo(0.8, 2);

    expect(end.h * 360).toBeCloseTo(307, 0);
    expect(end.l).toBeCloseTo(0.8, 2);
  });

  it("interpolates hue along the shortest path", () => {
    const gradient = prepareGradient({
      stops: [
        { at: 0, color: "#ff0000" }, // hue 0
        { at: 1, color: "#ff00ff" }, // hue 300
      ],
    });

    const out = sampleGradientHsl(gradient, 0.5, { h: 0, s: 0, l: 0 });

    // 0 -> 300 的短路径经过 330
    expect(out.h * 360).toBeCloseTo(330, 0);
  });

  it("returns the same color for a single stop", () => {
    const gradient = prepareGradient({
      stops: [{ at: 0.5, color: "#00ff00" }],
    });

    const a = sampleGradientHsl(gradient, 0, { h: 0, s: 0, l: 0 });
    const b = sampleGradientHsl(gradient, 1, { h: 0, s: 0, l: 0 });

    expect(a.h).toBeCloseTo(b.h, 6);
    expect(a.s).toBeCloseTo(b.s, 6);
    expect(a.l).toBeCloseTo(b.l, 6);
  });
});
