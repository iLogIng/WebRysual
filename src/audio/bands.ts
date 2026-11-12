// FFT 频段划分与电平归一化

export type Band = {
  begin: number;
  end: number;
};

// 对数频段 end 为开区间，范围 [1, fftSize / 2)
export function makeFftBands(
  sampleRate: number,
  fftSize: number,
  bandCount: number,
): Band[] {
  if (sampleRate <= 0 || fftSize < 2 || bandCount <= 0) return [];

  const nyquist = sampleRate * 0.5;
  const fMax = Math.min(16000, nyquist);
  if (fMax <= 0) return [];

  const fMin = Math.min(30, fMax * 0.5);
  const maxBin = Math.floor(fftSize / 2);
  const scale = fftSize / sampleRate;

  const bands: Band[] = [];

  for (let i = 0; i < bandCount; i++) {
    const t0 = i / bandCount;
    const t1 = (i + 1) / bandCount;

    const f0 = fMin * Math.pow(fMax / fMin, t0);
    const f1 = fMin * Math.pow(fMax / fMin, t1);

    const begin = clamp(Math.round(f0 * scale), 1, maxBin - 1);
    const end = clamp(Math.round(f1 * scale), begin + 1, maxBin);

    bands.push({ begin, end });
  }

  return bands;
}

// 将频域 dB 映射为 [0, 1] 的电平，并做帧率无关的衰减
export function updateLevels(
  freqDb: Float32Array,
  bands: Band[],
  levels: Float32Array,
  dt: number,
  minDb = -80,
  maxDb = 0,
  release = 0.85,
): void {
  // 60Hz 下等价于每帧 *release
  const decay = Math.pow(release, dt * 60);

  for (let b = 0; b < bands.length; b++) {
    const { begin, end } = bands[b];

    // 静音时 Analyser 返回 -Infinity， minDb 作为下界
    let peakDb = minDb;
    for (let k = begin; k < end && k < freqDb.length; k++) {
      if (freqDb[k] > peakDb) peakDb = freqDb[k];
    }

    const target = clamp((peakDb - minDb) / (maxDb - minDb), 0, 1);
    levels[b] = Math.max(target, levels[b] * decay);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}
