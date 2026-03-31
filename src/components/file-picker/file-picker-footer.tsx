import React from 'react';
import { Box, Text } from 'ink';
import type { FilePickerMode, FilePickerThemeStyles } from '../../types.js';

type FilePickerFooterProps = {
  mode: FilePickerMode;
  multiSelect: boolean;
  selectedCount: number;
  styles: FilePickerThemeStyles;
};

export function FilePickerFooter({
  mode,
  multiSelect,
  selectedCount,
  styles,
}: FilePickerFooterProps) {
  const hints: Array<{ key: string; action: string }> = [];

  if (mode === 'filtering') {
    hints.push({ key: 'Esc', action: 'clear filter' });
    hints.push({ key: 'Enter', action: 'open' });
  } else if (mode === 'error') {
    hints.push({ key: 'r', action: 'retry' });
    hints.push({ key: 'Esc', action: 'go back' });
  } else {
    hints.push({ key: 'Enter', action: multiSelect ? 'open/confirm' : 'open/select' });
    if (multiSelect) {
      hints.push({ key: 'Space', action: 'toggle' });
    }
    hints.push({ key: 'Bksp', action: 'back' });
    hints.push({ key: '/', action: 'filter' });
    hints.push({ key: 'Esc', action: 'cancel' });
  }

  if (multiSelect && selectedCount > 0) {
    hints.push({ key: '', action: `${selectedCount} selected` });
  }

  return (
    <Box {...styles.footer()} aria-role="toolbar" aria-label="Keyboard shortcuts">
      {hints.map(({ key, action }, i) => (
        <Box key={i} marginRight={1} aria-label={key ? `${key}: ${action}` : action}>
          {key ? <Text {...styles.footerKey()} aria-hidden>[{key}]</Text> : null}
          <Text {...styles.footerDescription()} aria-hidden> {action}</Text>
        </Box>
      ))}
    </Box>
  );
}
