import { useCallback, useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

/**
 * Reads a `?new=1` flag (used by the command palette and quick actions) and
 * clears it from the URL immediately so refreshes don't re-open dialogs.
 * The flag is reported once per occurrence.
 */
export function useNewModalFlag() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [flag, setFlag] = useState(false);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setFlag(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [location.search]);

  const clear = useCallback(() => setFlag(false), []);
  return [flag, clear];
}
