import { useEffect } from 'react';
import { useInput, useStdin } from 'ink';
import type { FilePickerStateAPI } from './use-file-picker-state.js';
import type { OnSelectCallback, OnCancelCallback } from '../../types.js';

type UseFilePickerProps = {
  isDisabled?: boolean;
  state: FilePickerStateAPI;
  onSelect?: OnSelectCallback;
  onCancel?: OnCancelCallback;
};

function isSelectableEntry(
  entry: { kind: string; symlinkTargetKind?: string },
  fileTypes: string,
): boolean {
  if (fileTypes === 'files') {
    return entry.kind === 'file' || (entry.kind === 'symlink' && entry.symlinkTargetKind === 'file');
  }
  if (fileTypes === 'directories') {
    return entry.kind === 'directory' || (entry.kind === 'symlink' && entry.symlinkTargetKind === 'directory');
  }
  return true;
}

// Home/End escape sequences that Ink's useInput doesn't expose.
// Ink does not surface Home/End keys through its public useInput hook, so we
// subscribe to the internal_eventEmitter on stdin to capture raw escape
// sequences. This is a deliberate reliance on an Ink internal API and may
// break if Ink changes or removes that emitter in a future version. See the
// "Known Limitations" section in the README.
const HOME_SEQUENCES = ['\x1B[H', '\x1BOH', '\x1B[1~', '\x1B[7~'];
const END_SEQUENCES = ['\x1B[F', '\x1BOF', '\x1B[4~', '\x1B[8~'];

export function useFilePicker({
  isDisabled = false,
  state,
  onSelect,
  onCancel,
}: UseFilePickerProps) {
  // Use raw stdin for Home/End keys since Ink's useInput swallows them
  const { internal_eventEmitter } = useStdin();

  useEffect(() => {
    const isActive = !isDisabled && state.mode !== 'loading';
    if (!isActive) return;

    const handleRawInput = (data: string) => {
      const raw = typeof data === 'string' ? data : String(data);
      if (HOME_SEQUENCES.includes(raw)) {
        state.focusFirst();
      } else if (END_SEQUENCES.includes(raw)) {
        state.focusLast();
      }
    };

    internal_eventEmitter?.on('input', handleRawInput);
    return () => {
      internal_eventEmitter?.removeListener('input', handleRawInput);
    };
  }, [isDisabled, state.mode, state.focusFirst, state.focusLast, internal_eventEmitter]);

  useInput(
    (input, key) => {
      // Escape
      if (key.escape) {
        if (state.mode === 'filtering') {
          state.clearFilter();
        } else if (state.mode === 'error') {
          state.navigateToParent();
        } else {
          onCancel?.();
        }
        return;
      }

      // Navigation: Up / Down
      if (key.upArrow) {
        state.focusPrevious();
        return;
      }
      if (key.downArrow) {
        state.focusNext();
        return;
      }

      // Go back: Backspace or Left Arrow
      if (key.backspace || key.delete) {
        if (state.mode === 'filtering') {
          state.deleteFilterChar();
        } else {
          state.navigateToParent();
        }
        return;
      }

      if (key.leftArrow) {
        if (state.mode !== 'filtering') {
          state.navigateToParent();
        }
        return;
      }

      // Right arrow: enter directory
      if (key.rightArrow) {
        const focused = state.getFocusedEntry();
        if (focused) {
          const isNavigable = focused.kind === 'directory' ||
            (focused.kind === 'symlink' && focused.symlinkTargetKind === 'directory');
          if (isNavigable) {
            state.navigateInto(focused.name);
          }
        }
        return;
      }

      // Enter: Select / Open / Submit
      if (key.return) {
        const focused = state.getFocusedEntry();
        if (!focused) return;

        const isNavigable = focused.kind === 'directory' ||
          (focused.kind === 'symlink' && focused.symlinkTargetKind === 'directory');

        if (isNavigable) {
          state.navigateInto(focused.name);
          return;
        }

        if (state.multiSelect) {
          const paths = Array.from(state.selectedPaths);
          if (paths.length === 0 && isSelectableEntry(focused, state.fileTypes)) {
            onSelect?.([focused.path]);
          } else if (paths.length > 0) {
            onSelect?.(paths);
          }
        } else {
          if (isSelectableEntry(focused, state.fileTypes)) {
            onSelect?.([focused.path]);
          }
        }
        return;
      }

      // Space: Toggle selection in multi-select browsing, otherwise treat as filter char
      if (input === ' ') {
        if (state.multiSelect && state.mode === 'browsing') {
          state.toggleSelection();
          return;
        }
        // Fall through to filter handling below so spaces can appear in filter text
      }

      // Slash: Activate filter mode
      if (input === '/' && state.mode === 'browsing') {
        state.startFiltering();
        return;
      }

      // Typing: Filter characters
      if (state.mode === 'filtering' && input && !key.ctrl && !key.meta) {
        state.updateFilter(input);
        return;
      }

      // Typing: Auto-enter filter mode on printable chars
      if (state.mode === 'browsing' && input && !key.ctrl && !key.meta) {
        state.startFiltering();
        state.updateFilter(input);
        return;
      }

      // Error mode: 'r' to retry
      if (state.mode === 'error' && input === 'r') {
        state.retry();
        return;
      }
    },
    { isActive: !isDisabled && state.mode !== 'loading' },
  );
}
