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
      <Text {...styles.headerPath()}>
        {config.directoryIcon} {truncatePath(currentPath, 50)}
      </Text>
      {isFiltering && (
        <Text {...styles.filterInput()}>
          {' '}/ {filterText}
          <Text inverse> </Text>
        </Text>
      )}
    </Box>
  );
}
