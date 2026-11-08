/**
 * Soft header tint taken from a banner image, so the home header and the
 * band behind the banner share the banner's colour. Results are cached per
 * image. Falls back to the brand mint if the image can't be read.
 */
/** top/mid: light pastels for the tinted header. edge: the banner's real top
 * colour (hex), where the full-bleed gradient meets the photo. statusLight /
 * statusDark: the status bar colour (top of the gradient) per theme. */
export type Tint = { top: string; mid: string; edge: string; statusLight: string; statusDark: string };

const hex = (rgb: number[]) => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
function hslToRgb(h: number, s: number, l: number): number[] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
// Same mix as the dark hero header in dark-theme.custom.css: 18% tint on #101713.
const mixDark = (rgb: number[]) => rgb.map((v, i) => v * 0.18 + [0x10, 0x17, 0x13][i] * 0.82);

const cache = new Map<string, Promise<Tint | null>>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function bannerTint(src: string): Promise<Tint | null> {
  if (!src || typeof document === 'undefined') return Promise.resolve(null);
  const cached = cache.get(src);
  if (cached) return cached;
  const job = new Promise<Tint | null>(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 16;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, 24, 16);
        // Weight the top of the image: it sits right under the header.
        const { data } = ctx.getImageData(0, 0, 24, 8);
        let r = 0; let g = 0; let b = 0; let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
        }
        if (!n) return resolve(null);
        // Exact colour of the top edge: the full-bleed fill continues it.
        const top = ctx.getImageData(0, 0, 24, 2).data;
        let er = 0; let eg = 0; let eb = 0; let en = 0;
        for (let i = 0; i < top.length; i += 4) {
          if (top[i + 3] < 128) continue;
          er += top[i]; eg += top[i + 1]; eb += top[i + 2]; en += 1;
        }
        const edgeRgb = en ? [er / en, eg / en, eb / en] : [r / n, g / n, b / n];
        const edge = hex(edgeRgb);
        const [h, s] = rgbToHsl(r / n, g / n, b / n);
        // Very light, gently saturated pastels so text stays readable.
        const sat = Math.round(Math.min(0.55, Math.max(0.2, s)) * 100);
        const topRgb = hslToRgb(Math.round(h), sat / 100, 0.9);
        resolve({
          top: `hsl(${Math.round(h)} ${sat}% 90%)`,
          mid: `hsl(${Math.round(h)} ${Math.round(sat * 0.7)}% 95%)`,
          edge,
          statusLight: hex(topRgb),
          statusDark: hex(mixDark(topRgb)),
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  cache.set(src, job);
  return job;
}

export function applyHeroTint(tint: Tint | null) {
  const root = document.documentElement;
  if (tint) {
    root.style.setProperty('--hero-tint', tint.top);
    root.style.setProperty('--hero-tint-mid', tint.mid);
  } else {
    root.style.removeProperty('--hero-tint');
    root.style.removeProperty('--hero-tint-mid');
  }
  window.dispatchEvent(new Event('hero-tint-change'));
}

/**
 * Full-bleed home hero: the banner's light gradient runs up behind the
 * transparent header, so the status bar must show the top of the current
 * slide's gradient, switched at the same moment as the slide.
 */
export function applyHeroBleed(tint: Tint | null) {
  const root = document.documentElement;
  if (tint) {
    root.style.setProperty('--hero-status', tint.statusLight);
    root.style.setProperty('--hero-status-dark', tint.statusDark);
  } else {
    root.style.removeProperty('--hero-status');
    root.style.removeProperty('--hero-status-dark');
  }
  window.dispatchEvent(new Event('hero-tint-change'));
}
