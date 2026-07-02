import { useEffect, useRef } from 'react';
import { readDirectory } from '../../lib/fs-operations.js';
import type { FilePickerAction } from './use-file-picker-state.js';

type UseDirectoryReaderProps = {
  mode: string;
  currentPath: string;
  dispatch: React.Dispatch<FilePickerAction>;
};

export function useDirectoryReader({
  mode,
  currentPath,
  dispatch,
}: UseDirectoryReaderProps) {
  const latestPathRef = useRef(currentPath);
  // Deliberate "latest value" ref pattern so the async reader can detect a
  // stale in-flight load; the write during render is intentional here.
  // eslint-disable-next-line react-hooks/refs
  latestPathRef.current = currentPath;

  useEffect(() => {
    if (mode !== 'loading') return;

    let cancelled = false;

    (async () => {
      try {
        const entries = await readDirectory(currentPath);

        if (cancelled || latestPathRef.current !== currentPath) return;

        dispatch({ type: 'load-directory-success', entries });
      } catch (error) {
        if (cancelled) return;

        const message = error instanceof Error
          ? error.message
          : 'Failed to read directory';
        dispatch({ type: 'load-directory-error', error: message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, currentPath, dispatch]);
}
