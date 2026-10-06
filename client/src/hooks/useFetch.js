import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../lib/api.js';

/**
 * Loads data with an async function and tracks loading/error state.
 * `reload()` refetches while keeping the previous data on screen (no loading flash).
 */
export function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const requestId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fetcher, deps);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await load();
      if (id === requestId.current) setState({ data, error: null, loading: false });
      return data;
    } catch (err) {
      if (id === requestId.current) setState((s) => ({ ...s, error: errorMessage(err), loading: false }));
      return null;
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}

/** Runs `callback` every `ms` milliseconds while mounted (and the tab is visible). */
export function useInterval(callback, ms) {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    if (!ms) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) ref.current();
    }, ms);
    return () => clearInterval(timer);
  }, [ms]);
}

/** Returns a function that runs at most once per `ms`, with a trailing call. */
export function useThrottle(callback, ms) {
  const ref = useRef(callback);
  ref.current = callback;
  const last = useRef(0);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  return useCallback(() => {
    const wait = ms - (Date.now() - last.current);
    if (wait <= 0) {
      last.current = Date.now();
      ref.current();
    } else if (!timer.current) {
      timer.current = setTimeout(() => {
        timer.current = null;
        last.current = Date.now();
        ref.current();
      }, wait);
    }
  }, [ms]);
}
