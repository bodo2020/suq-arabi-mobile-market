import { Fragment, type ReactNode } from 'react';
import BrandWordmark from './BrandWordmark';

export type BrandTone = 'light' | 'dark';

const BRAND = /سوبر ?ماركو/g;
const toneClass: Record<BrandTone, string> = {
  // White page: green + yellow.
  light: 'brand-name--inline brand-name--on-light',
  // Green surface: white + yellow (the wordmark's own colours).
  dark: 'brand-name--inline',
};

/** The official two-colour wordmark, sized to sit inside running text. */
export function InlineBrand({ tone = 'light' }: { tone?: BrandTone }) {
  return <BrandWordmark className={toneClass[tone]} />;
}

/**
 * Renders a sentence with every "سوبر ماركو" replaced by the official
 * wordmark (ســــــوبـرمــــاركو) in the colours that suit the background.
 * Anything that is not a plain string is passed through untouched.
 */
export default function BrandText({ children, tone = 'light' }: { children: ReactNode; tone?: BrandTone }) {
  if (typeof children !== 'string' || !BRAND.test(children)) {
    BRAND.lastIndex = 0;
    return <>{children}</>;
  }
  BRAND.lastIndex = 0;
  const parts = children.split(BRAND);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 && <InlineBrand tone={tone} />}
        </Fragment>
      ))}
    </>
  );
}
