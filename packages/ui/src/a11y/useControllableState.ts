import { useCallback, useState } from 'react';

/**
 * §3: every input is both controlled and uncontrolled, like a native one.
 *
 * `value` given → the caller owns the state. `defaultValue` given → the
 * component owns it. Switching from one mode to the other mid-life is a bug in
 * the caller, and it is loud rather than silent.
 */
export function useControllableState<T>(options: {
  value?: T | undefined;
  defaultValue: T;
  onChange?: ((next: T) => void) | undefined;
}): [T, (next: T) => void] {
  const { value, defaultValue, onChange } = options;
  const isControlled = value !== undefined;
  // State rather than a ref: the mode is read during render, and a ref read
  // during render is exactly what React tells you not to do.
  const [wasControlled] = useState(isControlled);
  const [internal, setInternal] = useState(defaultValue);

  if (wasControlled !== isControlled) {
    throw new Error(
      'Un champ ne peut pas passer de contrôlé à non contrôlé en cours de vie : donne `value` ou `defaultValue`, pas les deux en alternance.',
    );
  }

  const set = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [isControlled ? value : internal, set];
}
