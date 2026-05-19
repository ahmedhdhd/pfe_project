/**
 * Color conversion utilities for theme management
 * Converts hex colors to OKLCH format for modern CSS color spaces
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface XYZ {
  x: number;
  y: number;
  z: number;
}

interface Lab {
  l: number;
  a: number;
  b: number;
}

interface LCH {
  l: number;
  c: number;
  h: number;
}

interface OKLCH {
  l: string;
  c: string;
  h: string;
}

/**
 * Convert hex color to RGB
 */
function hexToRGB(hex: string): RGB {
  hex = hex.replace(/^#/, "");
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/**
 * Convert sRGB to linear RGB
 */
function sRGBToLinear(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear RGB to XYZ color space
 */
function rgbToXYZ(r: number, g: number, b: number): XYZ {
  const rl = sRGBToLinear(r);
  const gl = sRGBToLinear(g);
  const bl = sRGBToLinear(b);

  return {
    x: rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375,
    y: rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175,
    z: rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041,
  };
}

/**
 * Convert XYZ to Lab color space
 */
function xyzToLab(x: number, y: number, z: number): Lab {
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  const fx =
    x / xn > 0.008856 ? Math.pow(x / xn, 1 / 3) : (903.3 * (x / xn) + 16) / 116;
  const fy =
    y / yn > 0.008856 ? Math.pow(y / yn, 1 / 3) : (903.3 * (y / yn) + 16) / 116;
  const fz =
    z / zn > 0.008856 ? Math.pow(z / zn, 1 / 3) : (903.3 * (z / zn) + 16) / 116;

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * Convert Lab to LCH color space
 */
function labToLCH(l: number, a: number, b: number): LCH {
  const c = Math.sqrt(a * a + b * b);
  let h = Math.atan2(b, a) * (180 / Math.PI);
  if (h < 0) h += 360;

  return { l, c, h };
}

/**
 * Convert hex color to OKLCH format
 * @param hex - Hex color string (e.g., "#ff6b35")
 * @returns OKLCH object with lightness, chroma, and hue values
 */
export function hexToOKLCH(hex: string): OKLCH {
  const rgb = hexToRGB(hex);
  const xyz = rgbToXYZ(rgb.r, rgb.g, rgb.b);
  const lab = xyzToLab(xyz.x, xyz.y, xyz.z);
  const lch = labToLCH(lab.l, lab.a, lab.b);

  // Normalize to OKLCH ranges (approximate)
  return {
    l: (lch.l / 100).toFixed(3),
    c: (lch.c / 150).toFixed(3), // Approximate chroma normalization
    h: lch.h.toFixed(1),
  };
}

/**
 * Convert OKLCH object to CSS string
 * @param oklch - OKLCH color object
 * @returns CSS oklch() string
 */
export function oklchToCSS(oklch: OKLCH): string {
  return `oklch(${oklch.l} ${oklch.c} ${oklch.h})`;
}

/**
 * Convert hex color directly to OKLCH CSS string
 * @param hex - Hex color string
 * @returns CSS oklch() string
 */
export function hexToOKLCHString(hex: string): string {
  const oklch = hexToOKLCH(hex);
  return oklchToCSS(oklch);
}
