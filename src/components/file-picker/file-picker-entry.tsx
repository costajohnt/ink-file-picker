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

function buildEntryLabel(entry: FileEntry, isFocused: boolean, isSelected: boolean, multiSelect: boolean): string {
  const parts: string[] = [];
  const kind = entry.kind === 'symlink' && entry.symlinkTargetKind
    ? `symlink to ${entry.symlinkTargetKind}`
    : entry.kind;
  parts.push(entry.name);
  parts.push(kind);
  if (isFocused) parts.push('focused');
  if (multiSelect && isSelected) parts.push('selected');
  return parts.join(', ');
}

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

  const isDirectory = entry.kind === 'directory' ||
    (entry.kind === 'symlink' && entry.symlinkTargetKind === 'directory');

  const ariaState: Record<string, boolean> = { selected: isSelected };
  if (isDirectory) {
    ariaState.expanded = false;
  }

  return (
    <Box
      {...styles.entryRow({ isFocused })}
      aria-role="listitem"
      aria-state={ariaState}
      aria-label={isScreenReaderEnabled ? buildEntryLabel(entry, isFocused, isSelected, multiSelect) : undefined}
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
