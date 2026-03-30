import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useFilePickerState } from './use-file-picker-state.js';
import { useFilePicker } from './use-file-picker.js';
import { useDirectoryReader } from './use-directory-reader.js';
import { FilePickerEntry } from './file-picker-entry.js';
import { FilePickerHeader } from './file-picker-header.js';
import { FilePickerFooter } from './file-picker-footer.js';
import { FilePickerStatus } from './file-picker-status.js';
import defaultTheme from '../../theme.js';
import type { FilePickerProps } from '../../types.js';

export function FilePicker(props: FilePickerProps) {
  const {
    isDisabled = false,
    onSelect,
    onCancel,
    onDirectoryChange,
    showDetails = false,
    multiSelect = false,
  } = props;

  const state = useFilePickerState(props);
  useFilePicker({ isDisabled, state, onSelect, onCancel });
  useDirectoryReader({
    mode: state.mode,
    currentPath: state.currentPath,
    dispatch: state.dispatch,
  });

  useEffect(() => {
    if (state.mode === 'browsing') {
      onDirectoryChange?.(state.currentPath);
    }
  }, [state.currentPath, state.mode, onDirectoryChange]);

  const { styles, config } = defaultTheme;

  return (
    <Box {...styles.container()}>
      <FilePickerHeader
        currentPath={state.currentPath}
        filterText={state.filterText}
        isFiltering={state.mode === 'filtering'}
        config={config}
        styles={styles}
      />

      <Text {...styles.separator()}>
        {config.separatorChar.repeat(40)}
      </Text>

      {state.mode === 'loading' && (
        <FilePickerStatus type="loading" styles={styles} />
      )}

      {state.mode === 'error' && (
        <FilePickerStatus
          type="error"
          message={state.errorMessage}
          styles={styles}
        />
      )}

      {(state.mode === 'browsing' || state.mode === 'filtering') && (
        <>
          {state.filteredEntries.length === 0 ? (
            <Text {...styles.emptyDirectory()}>
              {state.filterText
                ? 'No matches'
                : 'Empty directory'}
            </Text>
          ) : (
            state.visibleEntries.map(entry => (
              <FilePickerEntry
                key={entry.name}
                entry={entry}
                isFocused={
                  !isDisabled && state.focusedEntryName === entry.name
                }
                isSelected={state.selectedPaths.has(entry.path)}
                showDetails={showDetails}
                multiSelect={multiSelect}
                config={config}
                styles={styles}
              />
            ))
          )}
        </>
      )}

      <Text {...styles.separator()}>
        {config.separatorChar.repeat(40)}
      </Text>

      <FilePickerFooter
        mode={state.mode}
        multiSelect={multiSelect}
        selectedCount={state.selectedPaths.size}
        styles={styles}
      />
    </Box>
  );
}
