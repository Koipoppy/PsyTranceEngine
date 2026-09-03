import type { StyleConfig, StyleName } from "../engine/types";

/** Style presets distilled from the psytrance research. */
export const STYLES: Record<StyleName, StyleConfig> = {
  goa: {
    label: "Goa 果阿",
    bpm: [137, 145],
    scales: ["phrygian", "phrygianDominant", "hungarianMinor"],
    brightness: 0.55,
    grit: 0.4,
    space: 0.55,
    density: 0.6,
    bassOctave: 0
  },
  fullon: {
    label: "Full-On",
    bpm: [142, 147],
    scales: ["phrygianDominant", "harmonicMinor", "dorian"],
    brightness: 0.8,
    grit: 0.55,
    space: 0.5,
    density: 0.8,
    bassOctave: 0
  },
  dark: {
    label: "Dark 深暗",
    bpm: [148, 156],
    scales: ["harmonicMinor", "hungarianMinor", "phrygian"],
    brightness: 0.35,
    grit: 0.85,
    space: 0.6,
    density: 0.7,
    bassOctave: 0
  },
  twilight: {
    label: "Twilight 暮光",
    bpm: [146, 152],
    scales: ["phrygian", "harmonicMinor", "naturalMinor"],
    brightness: 0.6,
    grit: 0.7,
    space: 0.55,
    density: 0.65,
    bassOctave: 0
  },
  progressive: {
    label: "Progressive",
    bpm: [130, 140],
    scales: ["dorian", "naturalMinor", "phrygian"],
    brightness: 0.5,
    grit: 0.3,
    space: 0.7,
    density: 0.55,
    bassOctave: 0
  }
};

export const STYLE_NAMES = Object.keys(STYLES) as StyleName[];