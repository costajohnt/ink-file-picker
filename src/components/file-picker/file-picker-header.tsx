import React from 'react';
import { Box, Text } from 'ink';
import { truncatePath } from '../../lib/path-utils.js';
import type { FilePickerThemeStyles, FilePickerTheme } from '../../types.js';

type FilePickerHeaderProps = {
  currentPath: string;
  filterText: string;
  isFiltering: boolean;
  config: FilePickerTheme['config'];
  styles: FilePickerThemeStyles;
};

export function FilePickerHeader({
  currentPath,
  filterText,
  isFiltering,
  config,
  styles,
}: FilePickerHeaderProps) {
  return (
    <Box {...styles.header()}>
      <Text {...styles.headerPath()} aria-label={`Current directory: ${currentPath}`}>
        <Text aria-hidden>{config.directoryIcon} </Text>
        {truncatePath(currentPath, 50)}
      </Text>
      {isFiltering && (
        <Text {...styles.filterInput()} aria-label={`Filter: ${filterText}`}>
          {' '}/ {filterText}
          <Text inverse aria-hidden> </Text>
        </Text>
      )}
    </Box>
  );
}
