import { useCallback, useEffect, useRef } from "react";

export type DebouncedCallback<T extends (...args: never[]) => void> = T & {
  cancel: () => void;
  flush: (...args: Parameters<T>) => void;
};

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delayMs: number
): DebouncedCallback<T> {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const argsRef = useRef<Parameters<T> | undefined>(undefined);

  callbackRef.current = callback;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const debounced = useCallback(
    ((...args: Parameters<T>) => {
      argsRef.current = args;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        argsRef.current = undefined;
        callbackRef.current(...args);
      }, delayMs);
    }) as T,
    [delayMs]
  ) as DebouncedCallback<T>;

  debounced.cancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = undefined;
    argsRef.current = undefined;
  };

  debounced.flush = (...args: Parameters<T>) => {
    debounced.cancel();
    callbackRef.current(...args);
  };

  return debounced;
}
