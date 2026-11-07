/**
 * Soft header tint taken from a banner image, so the home header and the
 * band behind the banner share the banner's colour. Results are cached per
 * image. Falls back to the brand mint if the image can't be read.
 */
/** top/mid: light pastels for the tinted header. edge: the banner's real top
 * colour (hex) for the full-bleed hero fill and the status bar; dark: whether
 * that edge needs light text on top of it. */
export type Tint = { top: string; mid: string; edge: string; dark: boolean };

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
        const edge = '#' + edgeRgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
        const dark = 0.299 * edgeRgb[0] + 0.587 * edgeRgb[1] + 0.114 * edgeRgb[2] < 150;
        const [h, s] = rgbToHsl(r / n, g / n, b / n);
        // Very light, gently saturated pastels so text stays readable.
        const sat = Math.round(Math.min(0.55, Math.max(0.2, s)) * 100);
        resolve({
          top: `hsl(${Math.round(h)} ${sat}% 90%)`,
          mid: `hsl(${Math.round(h)} ${Math.round(sat * 0.7)}% 95%)`,
          edge,
          dark,
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
 * Full-bleed home hero: the banner runs up behind the transparent header, so
 * the status bar must show the current banner's edge colour, switched at the
 * same moment as the slide (no CSS transition to wait for).
 */
export function applyHeroBleed(tint: Tint | null) {
  const root = document.documentElement;
  if (tint) {
    root.style.setProperty('--hero-edge', tint.edge);
    root.dataset.heroInk = tint.dark ? 'light' : 'dark';
  } else {
    root.style.removeProperty('--hero-edge');
    delete root.dataset.heroInk;
  }
  window.dispatchEvent(new Event('hero-tint-change'));
}
