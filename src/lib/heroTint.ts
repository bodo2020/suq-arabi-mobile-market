/**
 * Soft header tint taken from a banner image, so the home header and the
 * band behind the banner share the banner's colour. Results are cached per
 * image. Falls back to the brand mint if the image can't be read.
 */
type Tint = { top: string; mid: string };

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
        const [h, s] = rgbToHsl(r / n, g / n, b / n);
        // Very light, gently saturated pastels so text stays readable.
        const sat = Math.round(Math.min(0.55, Math.max(0.2, s)) * 100);
        resolve({ top: `hsl(${Math.round(h)} ${sat}% 90%)`, mid: `hsl(${Math.round(h)} ${Math.round(sat * 0.7)}% 95%)` });
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
