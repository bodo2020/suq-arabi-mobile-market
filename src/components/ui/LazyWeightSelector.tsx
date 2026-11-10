import { lazy, Suspense, type ComponentProps } from 'react';

// The weight sheet (and its drawer library) only loads the first time a
// customer opens it, instead of with every product card.
const WeightSelector = lazy(() => import('./WeightSelector'));

type Props = ComponentProps<typeof WeightSelector>;

export default function LazyWeightSelector(props: Props) {
  if (!props.isOpen) return null;
  return (
    <Suspense fallback={null}>
      <WeightSelector {...props} />
    </Suspense>
  );
}
