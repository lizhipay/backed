import { useSearchParams } from 'react-router-dom';

export function useUrlTab<T extends string>(
  allowed: readonly T[],
  fallback: T,
  param = 'tab',
) {
  const [params, setParams] = useSearchParams();
  const requested = params.get(param) as T | null;
  const value = requested && allowed.includes(requested) ? requested : fallback;

  const setValue = (next: T) => {
    const updated = new URLSearchParams(params);
    if (next === fallback) {
      updated.delete(param);
    } else {
      updated.set(param, next);
    }
    setParams(updated, { replace: true });
  };

  return [value, setValue] as const;
}
