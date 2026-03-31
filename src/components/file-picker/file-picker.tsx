import React, { useEffect, useMemo, useRef } from 'react';
import { Box, Text, useIsScreenReaderEnabled } from 'ink';
import { useFilePickerState } from './use-file-picker-state.js';
import { useFilePicker } from './use-file-picker.js';
import { useDirectoryReader } from './use-directory-reader.js';
import { FilePickerEntry } from './file-picker-entry.js';
import { FilePickerHeader } from './file-picker-header.js';
import { FilePickerFooter } from './file-picker-footer.js';
import { FilePickerStatus } from './file-picker-status.js';
import defaultTheme from '../../theme.js';
import type { FilePickerProps, FilePickerTheme } from '../../types.js';

function mergeTheme(
  base: FilePickerTheme,
  overrides?: Partial<FilePickerTheme>,
): FilePickerTheme {
  if (!overrides) return base;
  return {
    styles: { ...base.styles, ...overrides.styles },
    config: { ...base.config, ...overrides.config },
  };
}

export function FilePicker(props: FilePickerProps) {
  const {
    isDisabled = false,
    onSelect,
    onCancel,
    onDirectoryChange,
    showDetails = false,
    multiSelect = false,
    theme: themeOverrides,
  } = props;

  const state = useFilePickerState(props);
  useFilePicker({ isDisabled, state, onSelect, onCancel });
  useDirectoryReader({
    mode: state.mode,
    currentPath: state.currentPath,
    dispatch: state.dispatch,
  });

  // Only fire onDirectoryChange when currentPath actually changes, not on mode transitions
  const prevPathRef = useRef(state.currentPath);
  useEffect(() => {
    if (state.currentPath !== prevPathRef.current) {
      prevPathRef.current = state.currentPath;
      onDirectoryChange?.(state.currentPath);
    }
  }, [state.currentPath, onDirectoryChange]);

  const theme = useMemo(
    () => mergeTheme(defaultTheme, themeOverrides),
    [themeOverrides],
  );
  const { styles, config } = theme;
  const isScreenReaderEnabled = useIsScreenReaderEnabled();

  return (
    <Box {...styles.container()} aria-label="File picker">
      <FilePickerHeader
        currentPath={state.currentPath}
        filterText={state.filterText}
        isFiltering={state.mode === 'filtering'}
        config={config}
        styles={styles}
      />

      <Text {...styles.separator()} aria-hidden>
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
        <Box aria-role="list" aria-label={`File list, ${state.filteredEntries.length} items`}>
          {state.filteredEntries.length === 0 ? (
            <Box aria-role="listitem">
              <Text {...styles.emptyDirectory()}>
                {state.filterText
                  ? 'No matches'
                  : 'Empty directory'}
              </Text>
            </Box>
          ) : (
            <>
              {state.visibleFromIndex > 0 && (
                <Text dimColor aria-hidden>  {state.visibleFromIndex} more above</Text>
              )}
              {state.visibleEntries.map(entry => (
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
                  isScreenReaderEnabled={isScreenReaderEnabled}
                />
              ))}
              {state.visibleToIndex < state.filteredEntries.length && (
                <Text dimColor aria-hidden>  {state.filteredEntries.length - state.visibleToIndex} more below</Text>
              )}
            </>
          )}
        </Box>
      )}

      <Text {...styles.separator()} aria-hidden>
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
