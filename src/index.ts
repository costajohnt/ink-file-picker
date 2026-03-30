// Component
export { FilePicker } from './components/file-picker/index.js';
export type { FilePickerProps } from './types.js';

// Types (for consumers who need to work with entries)
export type {
  FileEntry,
  EntryKind,
  FileTypeFilter,
  EntryFilter,
  OnSelectCallback,
  OnCancelCallback,
  OnDirectoryChangeCallback,
  FilePickerTheme,
  FilePickerThemeStyles,
  FilePickerMode,
} from './types.js';

// Hooks (advanced usage -- building custom file picker UIs)
export { useFilePickerState } from './components/file-picker/use-file-picker-state.js';
export type { FilePickerStateAPI } from './components/file-picker/use-file-picker-state.js';
export { useFilePicker } from './components/file-picker/use-file-picker.js';
export { useDirectoryReader } from './components/file-picker/use-directory-reader.js';

// Utilities
export { formatSize } from './lib/format-size.js';
export { truncatePath } from './lib/path-utils.js';
