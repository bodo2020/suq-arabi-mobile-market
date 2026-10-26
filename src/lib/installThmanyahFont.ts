/**
 * The font belongs to Thmanyah Publishing & Distribution.
 * These source assets are used solely as part of the bundled customer app.
 * Explicit Vite ?inline imports prevent publishing individual standalone font
 * URLs in the built website (as Vite would normally do for OTF files).
 * Review the current official licence before distribution:
 * https://font.thmanyah.com/licenses
 */
import regularUrl from '@/assets/fonts/thmanyahsans-Regular.otf?inline';
import mediumUrl from '@/assets/fonts/thmanyahsans-Medium.otf?inline';
import boldUrl from '@/assets/fonts/thmanyahsans-Bold.otf?inline';
import blackUrl from '@/assets/fonts/thmanyahsans-Black.otf?inline';

const FONT_STYLE_ID = 'super-marko-thmanyah-font-faces';

export function installThmanyahFont(): void {
  if (typeof document === 'undefined' || document.getElementById(FONT_STYLE_ID)) return;

  const fontFaces = [
    { source: regularUrl, weight: '400' },
    { source: mediumUrl, weight: '500 600' },
    { source: boldUrl, weight: '700 800' },
    { source: blackUrl, weight: '900' },
  ];

  const style = document.createElement('style');
  style.id = FONT_STYLE_ID;
  style.textContent = fontFaces.map(({ source, weight }) => `
    @font-face {
      font-family: 'Thmanyah';
      src: url("${source}") format('opentype');
      font-style: normal;
      font-weight: ${weight};
      font-display: swap;
    }
  `).join('\n');

  document.head.appendChild(style);
}
