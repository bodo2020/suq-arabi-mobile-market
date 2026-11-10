import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

/**
 * Product grid that only draws what is near the screen:
 * - a grid further down the page waits as an empty box of the right height
 *   until the customer scrolls close to it;
 * - long grids (TanStack Virtual) then draw only the rows around the screen.
 * Columns follow the regular grid: 3 on phones, 4 / 5 / 6 on wider screens.
 */

const GRID = 'grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6';
const VIRTUAL_FROM = 24;
const NEAR_MARGIN = 1200; // px before a grid enters the screen

function columnsFor(width: number) {
  if (width >= 1280) return 6;
  if (width >= 1024) return 5;
  if (width >= 640) return 4;
  return 3;
}
const rowEstimate = (columns: number) => (columns === 3 ? 268 : 330);

type Props<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
};

function useColumns() {
  const [columns, setColumns] = useState(() => (typeof window === 'undefined' ? 3 : columnsFor(window.innerWidth)));
  useEffect(() => {
    const onResize = () => setColumns(columnsFor(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return columns;
}

export default function VirtualProductGrid<T>(props: Props<T>) {
  const columns = useColumns();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);

  // Grids already on (or just below) the screen draw right away.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (box.getBoundingClientRect().top < window.innerHeight + NEAR_MARGIN) { setNear(true); return; }
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: `${NEAR_MARGIN}px 0px` });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  if (!near) {
    const rows = Math.ceil(props.items.length / columns);
    return <div ref={boxRef} className={props.className} style={{ height: rows * rowEstimate(columns) }} aria-hidden="true" />;
  }
  if (props.items.length <= VIRTUAL_FROM) {
    return (
      <div className={`${GRID} ${props.className || ''}`}>
        {props.items.map(item => <div key={props.getKey(item)} className="min-w-0">{props.renderItem(item)}</div>)}
      </div>
    );
  }
  return <VirtualRows {...props} columns={columns} />;
}

function VirtualRows<T>({ items, getKey, renderItem, className = '', columns }: Props<T> & { columns: number }) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Distance from the top of the page, so the window scroll lines up with our rows.
  useLayoutEffect(() => {
    if (!listRef.current) return;
    const update = () => setScrollMargin(listRef.current ? listRef.current.getBoundingClientRect().top + window.scrollY : 0);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: Math.ceil(items.length / columns),
    estimateSize: () => rowEstimate(columns),
    overscan: 3,
    scrollMargin,
  });

  return (
    <div ref={listRef} className={className} style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map(row => {
        const start = row.index * columns;
        return (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className={`${GRID} pb-2 sm:pb-3`}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)` }}
          >
            {items.slice(start, start + columns).map(item => <div key={getKey(item)} className="min-w-0">{renderItem(item)}</div>)}
          </div>
        );
      })}
    </div>
  );
}
