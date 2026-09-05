import React from 'react';
import { cn } from '@/lib/utils';

interface BrandLoaderProps {
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

const BrandLoader: React.FC<BrandLoaderProps> = ({
  fullScreen = false,
  text,
  className,
}) => (
  <div
    className={cn(
      'flex items-center justify-center',
      fullScreen ? 'min-h-screen w-full bg-background px-6' : 'inline-flex',
      className,
    )}
    role="status"
    aria-live="polite"
    aria-label={text || 'جاري التحميل'}
    dir="rtl"
  >
    <div className={cn('flex items-center justify-center', fullScreen ? 'flex-col gap-4' : 'gap-2')}>
      <span
        className={cn(
          'brand-loader-mark relative flex shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-primary/15',
          fullScreen ? 'h-24 w-24 p-3' : 'h-6 w-6 p-0.5',
        )}
        aria-hidden="true"
      >
        <img
          src="/lovable-uploads/d10815b8-8471-477d-a779-2950224513a7.png"
          alt=""
          className="h-full w-full object-contain"
          width={fullScreen ? 96 : 24}
          height={fullScreen ? 96 : 24}
          decoding="async"
        />
      </span>
      {text && (
        <span className={cn('font-medium text-muted-foreground', fullScreen ? 'text-sm' : 'text-xs')}>
          {text}
        </span>
      )}
    </div>
  </div>
);

export default React.memo(BrandLoader);