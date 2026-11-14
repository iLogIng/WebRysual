import { describe, expect, it } from "vitest";
import { computeRms } from "./dsp";

describe("computeRms", () => {
  it("returns 0 for an empty buffer", () => {
    expect(computeRms(new Float32Array(0))).toBe(0);
  });

  it("returns 0 for silence", () => {
    expect(computeRms(new Float32Array([0, 0, 0, 0]))).toBe(0);
  });

  it("computes the RMS of a constant signal", () => {
    expect(computeRms(new Float32Array([0.5, 0.5, 0.5, 0.5]))).toBeCloseTo(
      0.5,
      6,
    );
  });

  it("computes the RMS of a full-scale square wave", () => {
    expect(computeRms(new Float32Array([1, -1, 1, -1]))).toBeCloseTo(1, 6);
  });
});
