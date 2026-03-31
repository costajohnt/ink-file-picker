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
    <Box {...styles.header()} aria-label={`Current directory: ${currentPath}`}>
      <Text {...styles.headerPath()}>
        <Text aria-hidden>{config.directoryIcon} </Text>
        {truncatePath(currentPath, 50)}
      </Text>
      {isFiltering && (
        <Box aria-role="textbox" aria-label={`Filter: ${filterText}`}>
          <Text {...styles.filterInput()}>
            {' '}/ {filterText}
            <Text inverse aria-hidden> </Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}
