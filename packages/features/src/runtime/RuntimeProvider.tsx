import { createContext, useContext, type ReactNode } from 'react';
import type { Runtime } from './runtime';

const RuntimeContext = createContext<Runtime | undefined>(undefined);

export function RuntimeProvider({
  runtime,
  children,
}: {
  runtime: Runtime;
  children: ReactNode;
}): ReactNode {
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}

/**
 * Throws rather than returning `undefined`: a screen without a runtime is a
 * wiring mistake, and failing at the first render says so louder than a
 * cascade of "cannot read property of undefined".
 */
export function useRuntime(): Runtime {
  const runtime = useContext(RuntimeContext);
  if (runtime === undefined) {
    throw new Error('useRuntime hors d’un RuntimeProvider');
  }
  return runtime;
}
