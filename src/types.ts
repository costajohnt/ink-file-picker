import type { BoxProps, TextProps } from 'ink';

// --- Filesystem Entry Types ---

/** The kind of filesystem entry */
export type EntryKind = 'file' | 'directory' | 'symlink';

/** A single filesystem entry with metadata */
export type FileEntry = {
  /** Entry name (basename only, e.g. "package.json") */
  readonly name: string;
  /** Absolute path to the entry */
  readonly path: string;
  /** What kind of entry this is */
  readonly kind: EntryKind;
  /** File size in bytes (0 for directories) */
  readonly size: number;
  /** Last modification timestamp (ms since epoch) */
  readonly modifiedAt: number;
  /** Whether this is a dotfile / hidden entry */
  readonly isHidden: boolean;
  /** If symlink, the resolved target path (undefined if not a symlink or broken) */
  readonly symlinkTarget?: string;
  /** If symlink, the kind of the target */
  readonly symlinkTargetKind?: EntryKind;
};

/** A stable unique key for a FileEntry within a directory listing */
export type EntryId = string;

// --- Selection Types ---

export type SelectionMode = 'single' | 'multi';

export type FileTypeFilter = 'files' | 'directories' | 'all';

// --- Filter Types ---

/** User-provided filter: either a glob string or a predicate function */
export type EntryFilter = string | ((entry: FileEntry) => boolean);

// --- Callback Types ---

/** Called when file(s) are selected and confirmed */
export type OnSelectCallback = (paths: string[]) => void;

/** Called when the user cancels (Escape) */
export type OnCancelCallback = () => void;

/** Called whenever the current directory changes */
export type OnDirectoryChangeCallback = (path: string) => void;

// --- Component Props ---

export type FilePickerProps = {
  /**
   * Starting directory path.
   * @default process.cwd()
   */
  readonly initialPath?: string;

  /**
   * Glob pattern or predicate function to filter visible entries.
   * Glob is matched against entry names (not full paths).
   * Only affects visibility -- directories needed for navigation are always shown
   * unless fileTypes is 'directories'.
   */
  readonly filter?: EntryFilter;

  /**
   * Show hidden files (dotfiles).
   * @default false
   */
  readonly showHidden?: boolean;

  /**
   * Show file size and modification date columns.
   * @default false
   */
  readonly showDetails?: boolean;

  /**
   * Enable multi-select mode (Space to toggle, Enter to confirm).
   * When false (default), Enter immediately selects and submits the focused file.
   * @default false
   */
  readonly multiSelect?: boolean;

  /**
   * Which entry types to show and allow selection of.
   * - 'files': only show files (directories still shown for navigation)
   * - 'directories': only show directories
   * - 'all': show everything
   * @default 'all'
   */
  readonly fileTypes?: FileTypeFilter;

  /**
   * Maximum number of entries visible at once (virtual scrolling window).
   * @default 10
   */
  readonly maxHeight?: number;

  /**
   * Called when selection is confirmed.
   * In single-select: called with a 1-element array.
   * In multi-select: called with all selected paths.
   */
  readonly onSelect?: OnSelectCallback;

  /**
   * Called when the user presses Escape at the root level
   * or presses Escape while not filtering.
   */
  readonly onCancel?: OnCancelCallback;

  /**
   * Called whenever the current directory changes.
   */
  readonly onDirectoryChange?: OnDirectoryChangeCallback;

  /**
   * When disabled, user input is ignored.
   * @default false
   */
  readonly isDisabled?: boolean;
};

// --- Theme Types ---

export type FilePickerThemeStyles = {
  container: () => BoxProps;
  header: () => BoxProps;
  headerPath: () => TextProps;
  filterInput: () => TextProps;
  separator: () => TextProps;
  entryRow: (state: { isFocused: boolean }) => BoxProps;
  entryIcon: (state: { kind: EntryKind }) => TextProps;
  entryName: (state: {
    isFocused: boolean;
    isSelected: boolean;
    kind: EntryKind;
  }) => TextProps;
  entryDetails: () => TextProps;
  selectedIndicator: () => TextProps;
  focusIndicator: () => TextProps;
  footer: () => BoxProps;
  footerKey: () => TextProps;
  footerDescription: () => TextProps;
  spinner: () => TextProps;
  error: () => TextProps;
  emptyDirectory: () => TextProps;
};

export type FilePickerTheme = {
  styles: FilePickerThemeStyles;
  config: {
    directoryIcon: string;
    fileIcon: string;
    symlinkIcon: string;
    separatorChar: string;
    directoryTrail: string;
    symlinkIndicator: string;
  };
};

// --- State Machine Types ---

export type FilePickerMode = 'loading' | 'browsing' | 'filtering' | 'error';
