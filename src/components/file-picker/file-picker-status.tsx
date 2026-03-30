import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { SPINNER_FRAMES, SPINNER_INTERVAL } from '../../constants.js';
import type { FilePickerThemeStyles } from '../../types.js';

type FilePickerStatusProps = {
  type: 'loading' | 'error';
  message?: string;
  styles: FilePickerThemeStyles;
};

function useSpinner(isActive: boolean): string {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % SPINNER_FRAMES.length);
    }, SPINNER_INTERVAL);
    return () => clearInterval(timer);
  }, [isActive]);

  return SPINNER_FRAMES[frame]!;
}

export function FilePickerStatus({
  type,
  message,
  styles,
}: FilePickerStatusProps) {
  const spinnerChar = useSpinner(type === 'loading');

  if (type === 'loading') {
    return (
      <Text {...styles.spinner()}>
        {spinnerChar} Loading directory...
      </Text>
    );
  }

  if (type === 'error') {
    return (
      <Text {...styles.error()}>
        x Error: {message ?? 'Unknown error'}
      </Text>
    );
  }

  return null;
}
