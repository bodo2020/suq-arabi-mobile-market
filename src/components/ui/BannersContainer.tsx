import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applyHeroTint, bannerTint } from '@/lib/heroTint';
import { saveImageToDisk, useDiskCachedImage } from '@/lib/imageDiskCache';
import './hero-banner.css';

interface BannerItem {
  id: string;
  title: string;
  image_url: string;
  link?: string | null;
  category_id?: string | null;
  main_category_id?: string | null;
  company_id?: string | null;
  products?: string[] | null;
}

interface BannersContainerProps {
  banners: BannerItem[];
}

const INTERVAL = 5000;

/** Banner photo, from the copy saved on the phone when there is one. */
const BannerImage: React.FC<{ src: string; alt: string; eager: boolean }> = ({ src, alt, eager }) => {
  const display = useDiskCachedImage(src || '/placeholder.svg');
  if (!display) return null;
  return (
    <img
      src={display}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      onLoad={() => { if (display === src) saveImageToDisk(src); }}
      onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = src && display !== src ? src : '/placeholder.svg'; }}
    />
  );
};

/**
 * Home hero: swipeable banners (the next one peeks in), story-style progress
 * dots, and the header/band above take a soft tint from the current banner.
 */
const BannersContainer: React.FC<BannersContainerProps> = ({ banners }) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  const navigate = useNavigate();
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(true);
  const frameRef = useRef<number | null>(null);
  const multi = banners.length > 1;

  // Bring slide `index` to the start edge of the track (works in RTL too).
  const goTo = useCallback((index: number, smooth = true) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    const delta = slide.getBoundingClientRect().right - track.getBoundingClientRect().right;
    track.scrollBy({ left: delta, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Which slide is showing, from the scroll position.
  const onScroll = () => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const track = trackRef.current;
      if (!track) return;
      const edge = track.getBoundingClientRect().right;
      let best = 0;
      let bestDistance = Infinity;
      Array.from(track.children).forEach((child, index) => {
        const distance = Math.abs((child as HTMLElement).getBoundingClientRect().right - edge);
        if (distance < bestDistance) { bestDistance = distance; best = index; }
      });
      setCurrent(previous => (previous === best ? previous : best));
    });
  };

  // Autoplay: next slide every 5s while visible and not touched.
  useEffect(() => {
    if (!multi || paused) return;
    const timer = window.setTimeout(() => {
      if (document.hidden || !visibleRef.current || document.body.dataset.productSheetOpen === 'true' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setTick(value => value + 1); // try again in 5s
        return;
      }
      goTo((current + 1) % banners.length);
    }, INTERVAL);
    return () => window.clearTimeout(timer);
  }, [current, paused, multi, banners.length, goTo, tick]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !rootRef.current) return;
    const observer = new IntersectionObserver(entries => {
      visibleRef.current = entries.some(entry => entry.isIntersecting);
    }, { threshold: 0.3 });
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  // Header + band take the current banner's colour.
  useEffect(() => {
    const src = banners[current]?.image_url;
    let alive = true;
    void bannerTint(src).then(tint => { if (alive) applyHeroTint(tint); });
    return () => { alive = false; };
  }, [current, banners]);
  useEffect(() => () => applyHeroTint(null), []);

  useEffect(() => { if (current >= banners.length) setCurrent(0); }, [banners.length, current]);

  const open = (banner: BannerItem) => {
    const hasTarget = Boolean(banner.products?.length || banner.company_id || banner.main_category_id || banner.category_id);
    if (hasTarget) { navigate(`/banner-products/${banner.id}`); return; }
    if (!banner.link) return;
    if (/^https?:\/\//i.test(banner.link)) window.location.assign(banner.link);
    else navigate(banner.link);
  };

  if (banners.length === 0) return null;

  return (
    <section
      ref={rootRef}
      className={`hero-banner ${multi ? 'hero-banner--multi' : ''} ${paused ? 'is-paused' : ''}`}
      aria-roledescription="carousel"
      aria-label="عروض سوبر ماركو"
      style={{ '--hero-interval': `${INTERVAL}ms` } as React.CSSProperties}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div ref={trackRef} className="hero-banner__track" onScroll={onScroll} dir="rtl">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            className={`hero-banner__slide ${index === current ? 'is-active' : ''}`}
            onClick={() => open(banner)}
            aria-label={banner.title || 'فتح العرض'}
          >
            <BannerImage
              key={index === current ? `${banner.id}-on` : banner.id}
              src={banner.image_url}
              alt={banner.title || 'عرض من سوبر ماركو'}
              eager={index === 0}
            />
          </button>
        ))}
      </div>

      {multi && (
        <div className="hero-banner__dots">
          {banners.map((banner, index) => (
            <button
              key={`${banner.id}-${index === current ? current : 'x'}`}
              type="button"
              onClick={() => goTo(index)}
              className={`hero-banner__dot ${index === current ? 'is-active' : ''}`}
              aria-label={`البانر ${index + 1}`}
              aria-current={index === current}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default BannersContainer;
