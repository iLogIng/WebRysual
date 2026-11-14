import { describe, expect, it } from "vitest";
import { makeFftBands, updateLevels, type Band } from "./bands";

describe("makeFftBands", () => {
  it("builds 48 log-spaced bands for 48k / fftSize 2048", () => {
    const bands = makeFftBands(48000, 2048, 48);

    expect(bands).toHaveLength(48);
    expect(bands[0]).toEqual({ begin: 1, end: 2 });
    expect(bands[47]).toEqual({ begin: 599, end: 683 });

    for (let i = 0; i < bands.length; i++) {
      const band = bands[i];
      expect(band.begin).toBeGreaterThanOrEqual(1);
      expect(band.end).toBeGreaterThan(band.begin);
      expect(band.end).toBeLessThanOrEqual(1024);

      if (i > 0) {
        expect(band.begin).toBeGreaterThanOrEqual(bands[i - 1].begin);
      }
    }
  });

  it("clamps to nyquist for low sample rates", () => {
    const bands = makeFftBands(8000, 2048, 48);
    expect(bands).toHaveLength(48);
    expect(bands[bands.length - 1].end).toBeLessThanOrEqual(1024);
  });

  it("returns an empty list for invalid parameters", () => {
    expect(makeFftBands(0, 2048, 48)).toEqual([]);
    expect(makeFftBands(48000, 1, 48)).toEqual([]);
    expect(makeFftBands(48000, 2048, 0)).toEqual([]);
  });
});

describe("updateLevels", () => {
  it("treats -Infinity as silence", () => {
    const bands: Band[] = [
      { begin: 1, end: 2 },
      { begin: 2, end: 4 },
    ];
    const freq = new Float32Array(4).fill(-Infinity);
    const levels = new Float32Array(2);

    updateLevels(freq, bands, levels, 1 / 60);

    expect(levels[0]).toBe(0);
    expect(levels[1]).toBe(0);
  });

  it("uses the peak bin inside each band", () => {
    const bands: Band[] = [
      { begin: 0, end: 1 },
      { begin: 1, end: 4 },
    ];
    const freq = new Float32Array([-60, -60, -40, -20]);
    const levels = new Float32Array(2);

    updateLevels(freq, bands, levels, 1 / 60);

    expect(levels[0]).toBeCloseTo(0.25, 5);
    expect(levels[1]).toBeCloseTo(0.75, 5);
  });

  it("is frame-rate independent over one second", () => {
    const bands: Band[] = [{ begin: 0, end: 1 }];
    const freq = new Float32Array([-Infinity]);

    const at60 = new Float32Array([1]);
    for (let i = 0; i < 60; i++) {
      updateLevels(freq, bands, at60, 1 / 60);
    }

    const at120 = new Float32Array([1]);
    for (let i = 0; i < 120; i++) {
      updateLevels(freq, bands, at120, 1 / 120);
    }

    expect(at60[0]).toBeCloseTo(at120[0], 6);
    expect(at60[0]).toBeCloseTo(Math.pow(0.85, 60), 6);
  });

  it("keeps the target when it is above the decayed level", () => {
    const bands: Band[] = [{ begin: 0, end: 1 }];
    const freq = new Float32Array([-40]);
    const levels = new Float32Array([1]);

    // release=0.1 -> decay far below target 0.5
    updateLevels(freq, bands, levels, 1 / 60, -80, 0, 0.1);

    expect(levels[0]).toBeCloseTo(0.5, 5);
  });

  it("clamps outside the dB range", () => {
    const bands: Band[] = [
      { begin: 0, end: 1 },
      { begin: 1, end: 2 },
    ];
    const freq = new Float32Array([20, -200]);
    const levels = new Float32Array(2);

    updateLevels(freq, bands, levels, 1 / 60);

    expect(levels[0]).toBe(1);
    expect(levels[1]).toBe(0);
  });
});
