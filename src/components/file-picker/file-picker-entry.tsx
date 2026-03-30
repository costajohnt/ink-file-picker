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
};

export function FilePickerEntry({
  entry,
  isFocused,
  isSelected,
  showDetails,
  multiSelect,
  config,
  styles,
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
    <Box {...styles.entryRow({ isFocused })}>
      {isFocused ? (
        <Text {...styles.focusIndicator()}>{'>'}</Text>
      ) : (
        <Text> </Text>
      )}

      {multiSelect && (
        <Text {...styles.selectedIndicator()}>
          {isSelected ? '[x]' : '[ ]'}
        </Text>
      )}

      <Text {...styles.entryIcon({ kind: entry.kind })}>{icon}</Text>

      <Text
        {...styles.entryName({ isFocused, isSelected, kind: entry.kind })}
        wrap="truncate"
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
