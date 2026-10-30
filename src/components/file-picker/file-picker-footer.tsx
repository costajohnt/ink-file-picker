import {Box, Text} from 'ink';
import type {FilePickerMode, FilePickerThemeStyles} from '../../types.js';

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
  const hints: Array<{key: string; action: string}> = [];

  if (mode === 'filtering') {
    hints.push({key: 'Esc', action: 'clear filter'}, {key: 'Enter', action: 'open'});
  } else if (mode === 'error') {
    hints.push({key: 'r', action: 'retry'}, {key: 'Esc', action: 'go back'});
  } else {
    hints.push({key: 'Enter', action: multiSelect ? 'open/confirm' : 'open/select'});
    if (multiSelect) {
      hints.push({key: 'Space', action: 'toggle'});
    }

    hints.push({key: 'Bksp', action: 'back'}, {key: '/', action: 'filter'}, {key: 'Esc', action: 'cancel'});
  }

  if (multiSelect && selectedCount > 0) {
    hints.push({key: '', action: `${selectedCount} selected`});
  }

  return (
    <Box {...styles.footer()} aria-role="toolbar">
      {hints.map(({key, action}, i) => (
        <Box key={i} marginRight={1}>
          {key === '' ? null : <Text {...styles.footerKey()}>[{key}]</Text>}
          <Text {...styles.footerDescription()}> {action}</Text>
        </Box>
      ))}
    </Box>
  );
}
