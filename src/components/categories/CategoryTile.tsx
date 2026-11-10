import { useState, type CSSProperties } from 'react';
import { useDiskCachedImage } from '@/lib/imageDiskCache';
import './category-tiles.css';

function TileImage({ src, index }: { src: string; index: number }) {
  const resolved = useDiskCachedImage(src);
  const [failed, setFailed] = useState(false);
  if (!resolved || failed) return null;
  return <img src={resolved} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className={`cat-tile__img cat-tile__img--${index}`} draggable={false} />;
}

type Props = {
  name: string;
  color: string;
  images: string[];
  fallbackImage?: string | null;
  onClick: () => void;
};

/** Rectangle category card: name on top, real product photos below. */
export default function CategoryTile({ name, color, images, fallbackImage, onClick }: Props) {
  const pictures = images.length ? images : fallbackImage ? [fallbackImage] : [];
  return (
    <button type="button" onClick={onClick} className="cat-tile" style={{ '--tile': color } as CSSProperties}>
      <span className="cat-tile__name">{name.trim()}</span>
      <span className={`cat-tile__pics cat-tile__pics--${Math.min(pictures.length, 3)}`} aria-hidden="true">
        {pictures.slice(0, 3).map((src, index) => <TileImage key={src} src={src} index={index} />)}
      </span>
    </button>
  );
}

type BannerProps = { title: string; subtitle: string; images: string[]; onClick: () => void };

/** Full-width offers card at the top of the grid. */
export function CategoryOffersBanner({ title, subtitle, images, onClick }: BannerProps) {
  return (
    <button type="button" onClick={onClick} className="cat-offers">
      <span className="cat-offers__text">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <span className="cat-offers__pics" aria-hidden="true">
        {images.slice(0, 3).map((src, index) => <TileImage key={src} src={src} index={index} />)}
      </span>
    </button>
  );
}
