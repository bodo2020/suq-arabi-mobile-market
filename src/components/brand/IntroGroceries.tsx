/**
 * Groceries that drop into the bag during the launch intro. Each item is
 * clipped at the bag's opening, so it looks like it lands inside and pokes
 * out of the top. Simple flat shapes in the brand palette.
 */
export default function IntroGroceries() {
  return (
    <span className="brand-intro__items" aria-hidden="true">
      {/* Baguette */}
      <svg className="brand-intro__item brand-intro__item--bread" viewBox="0 0 24 64" fill="none">
        <rect x="4" y="2" width="16" height="60" rx="8" fill="#E8A33D" />
        <path d="M8 14l8-4M8 26l8-4M8 38l8-4" stroke="#FFE2A8" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      {/* Leafy greens */}
      <svg className="brand-intro__item brand-intro__item--greens" viewBox="0 0 40 44" fill="none">
        <path d="M20 44C6 36 2 20 10 6c6 8 8 18 10 38Z" fill="#7ED957" />
        <path d="M20 44c14-8 18-24 10-38-6 8-8 18-10 38Z" fill="#5CC24A" />
        <path d="M20 44c-2-16-2-30 0-42 2 12 2 26 0 42Z" fill="#A6EC78" />
      </svg>
      {/* Carrot */}
      <svg className="brand-intro__item brand-intro__item--carrot" viewBox="0 0 30 64" fill="none">
        <path d="M15 62 6 20c6-4 12-4 18 0Z" fill="#FF8A1E" />
        <path d="M15 18C13 8 8 4 5 3m10 15V1m0 17c2-10 7-14 10-15" stroke="#3DBE6E" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M10 31h5m-3 10h4" stroke="#E06A00" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {/* Milk */}
      <svg className="brand-intro__item brand-intro__item--milk" viewBox="0 0 28 52" fill="none">
        <path d="M4 14 14 4l10 10v36H4Z" fill="#fff" />
        <path d="M4 14h20" stroke="#cfe3d6" strokeWidth="2" />
        <rect x="8" y="24" width="12" height="12" rx="3" fill="#7CC4EA" />
      </svg>
    </span>
  );
}
