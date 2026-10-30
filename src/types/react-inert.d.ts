// React 18 types predate the `inert` HTML attribute (standardized in React 19
// typings). Augment the HTML attributes so components using `inert` typecheck
// while keeping the same runtime behavior.
declare module 'react' {
  interface HTMLAttributes<T> {
    inert?: boolean | undefined;
  }
}

export {};
