/** Scroll only the chip strip: scrollIntoView also moves the page's ancestors. */
export function centerSectionChip(strip: HTMLElement, chip: HTMLElement) {
  const viewport = strip.getBoundingClientRect();
  const item = chip.getBoundingClientRect();
  const left = (item.left + item.right - viewport.left - viewport.right) / 2;
  if (Math.abs(left) > 1) strip.scrollBy({ left, behavior: 'auto' });
}
