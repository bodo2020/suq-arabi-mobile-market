import React, { ImgHTMLAttributes, useEffect, useRef, useState } from 'react';

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  originalSrc?: string;
  fallbackSrc?: string;
  preloadMargin?: string;
}

const SmartImage: React.FC<SmartImageProps> = ({
  src,
  originalSrc,
  fallbackSrc = '/placeholder.svg',
  preloadMargin = '700px 0px',
  className = '',
  alt = '',
  ...props
}) => {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [useOriginal,setUseOriginal]=useState(false);
  const source = String(src || '').trim() || fallbackSrc;

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setAttempt(0);
    setUseOriginal(false);
  }, [source]);

  useEffect(() => {
    const node = hostRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: preloadMargin, threshold: 0.01 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [preloadMargin]);

  const retry = () => {
    if(originalSrc && source!==originalSrc && !useOriginal){setUseOriginal(true);return;}
    if (attempt >= 2) {
      setFailed(true);
      setLoaded(true);
      return;
    }
    window.setTimeout(() => {
      setAttempt(value => value + 1);
      setLoaded(false);
    }, 900 * (attempt + 1));
  };

  const finalSource = failed ? fallbackSrc : useOriginal && originalSrc ? originalSrc : source;

  return (
    <span ref={hostRef} className="relative block h-full w-full overflow-hidden bg-white">
      {/* Static placeholder: a pulse here ran on every not-yet-loaded card (including
          off-screen lazy ones) and forced a style recalc every frame. */}
      {!loaded && <span className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" aria-hidden="true" />}
      {shouldLoad && (
        <img
          key={`${finalSource}:${attempt}`}
          src={finalSource}
          alt={alt}
          decoding="async"
          loading="eager"
          onLoad={() => setLoaded(true)}
          onError={retry}
          className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          {...props}
        />
      )}
    </span>
  );
};

export default React.memo(SmartImage);
