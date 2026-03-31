import React from 'react';
import { Box, Text } from 'ink';
import { basename } from 'node:path';
import { formatSize } from '../../lib/format-size.js';
import type { FileEntry, FilePickerThemeStyles, FilePickerTheme } from '../../types.js';

type FilePickerEntryProps = {
  entry: FileEntry;
  isFocused: boolean;
  isSelected: boolean;
  showDetails: boolean;
  multiSelect: boolean;
  config: FilePickerTheme['config'];
  styles: FilePickerThemeStyles;
  isScreenReaderEnabled: boolean;
};

export function FilePickerEntry({
  entry,
  isFocused,
  isSelected,
  showDetails,
  multiSelect,
  config,
  styles,
  isScreenReaderEnabled,
}: FilePickerEntryProps) {
  const icon = entry.kind === 'directory'
    ? config.directoryIcon
    : entry.kind === 'symlink'
    ? config.symlinkIcon
    : config.fileIcon;

  const displayName = entry.kind === 'directory'
    ? entry.name + config.directoryTrail
    : entry.name;

  return (
    <Box
      {...styles.entryRow({ isFocused })}
      aria-role="listitem"
      aria-state={{ selected: isSelected || isFocused }}
    >
      {isFocused ? (
        <Text {...styles.focusIndicator()} aria-hidden>{'>'}</Text>
      ) : (
        <Text aria-hidden> </Text>
      )}

      {multiSelect && (
        <Box aria-role="checkbox" aria-state={{checked: isSelected}}>
          <Text {...styles.selectedIndicator()} aria-hidden>
            {isSelected ? '[x]' : '[ ]'}
          </Text>
        </Box>
      )}

      <Text {...styles.entryIcon({ kind: entry.kind })} aria-hidden>{icon}</Text>

      <Text
        {...styles.entryName({ isFocused, isSelected, kind: entry.kind })}
        wrap="truncate"
        aria-label={isScreenReaderEnabled ? `${entry.name}, ${entry.kind}` : undefined}
      >
        {displayName}
      </Text>

      {showDetails && entry.kind === 'file' && (
        <Text {...styles.entryDetails()}>
          {formatSize(entry.size).padStart(8)}
        </Text>
      )}

      {entry.kind === 'symlink' && entry.symlinkTarget && (
        <Text dimColor>
          {' '}{config.symlinkIndicator} {basename(entry.symlinkTarget)}
        </Text>
      )}
    </Box>
  );
}
