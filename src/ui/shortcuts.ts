export type Shortcut = {
  keys: string[];
  label: string;
};

export type ShortcutGroup = {
  title: string;
  items: Shortcut[];
};

// 展示层数据源；修改快捷键时需同步 src/ui/input.ts
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "播放",
    items: [
      { keys: ["Space"], label: "暂停 / 继续" },
      { keys: [",", ".", "←", "→"], label: "后退 / 前进 5 秒" },
      { keys: ["-", "="], label: "音量 -/+ 0.05" },
      { keys: ["n", "p"], label: "下一首 / 上一首" },
    ],
  },
  {
    title: "显示",
    items: [
      { keys: ["1", "2"], label: "Spectrum / Waveform" },
      { keys: ["L"], label: "播放列表" },
      { keys: ["F"], label: "全屏" },
      { keys: ["H", "?"], label: "快捷键提示" },
    ],
  },
];
