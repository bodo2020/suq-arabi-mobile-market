// Shared geometry for the mobile product sheet and its swipe peeks. The peek
// cards must match the real sheet exactly so the swipe handoff has no jump.

/** White round button floating over the photo (close, cart, favourite, share). */
export const SHEET_ROUND_BUTTON =
  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-slate-800 shadow-[0_4px_14px_rgba(15,23,42,.10)] ring-1 ring-black/[0.04] active:scale-95';

/** Full-bleed photo area at the very top of the sheet (no title bar). */
export const SHEET_GALLERY =
  'photo-surface relative -mx-3 flex h-[min(42dvh,350px)] items-center justify-center overflow-hidden rounded-b-[28px] bg-white';

/** The product photo inside the gallery; side padding leaves room for the buttons. */
export const SHEET_IMAGE = 'h-full w-full object-contain px-16 pb-5 pt-6';
