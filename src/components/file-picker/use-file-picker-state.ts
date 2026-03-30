import { useReducer, useCallback, useMemo } from 'react';
import { dirname } from 'node:path';
import picomatch from 'picomatch';
import { EntryMap } from '../../lib/entry-map.js';
import type {
  FileEntry,
  FilePickerMode,
  FilePickerProps,
  FileTypeFilter,
  EntryFilter,
} from '../../types.js';

// --- State Shape ---

export type FilePickerState = {
  mode: FilePickerMode;
  currentPath: string;
  pathHistory: string[];
  allEntries: FileEntry[];
  filteredEntries: FileEntry[];
  entryMap: EntryMap;
  focusedEntryName: string | undefined;
  selectedPaths: Set<string>;
  visibleFromIndex: number;
  visibleToIndex: number;
  visibleEntryCount: number;
  filterText: string;
  errorMessage: string | undefined;
  showHidden: boolean;
  showDetails: boolean;
  multiSelect: boolean;
  fileTypes: FileTypeFilter;
  filter: EntryFilter | undefined;
};

// --- Action Types ---

export type FilePickerAction =
  | { type: 'load-directory'; path: string }
  | { type: 'load-directory-success'; entries: FileEntry[] }
  | { type: 'load-directory-error'; error: string }
  | { type: 'navigate-into-directory'; name: string }
  | { type: 'navigate-to-parent' }
  | { type: 'focus-next' }
  | { type: 'focus-previous' }
  | { type: 'focus-first' }
  | { type: 'focus-last' }
  | { type: 'select-focused-entry' }
  | { type: 'toggle-selection' }
  | { type: 'start-filtering' }
  | { type: 'update-filter'; char: string }
  | { type: 'delete-filter-char' }
  | { type: 'clear-filter' }
  | { type: 'retry' }
  | { type: 'cancel' };

// --- Helpers ---

function compareEntries(a: FileEntry, b: FileEntry): number {
  const aIsDir = a.kind === 'directory' ||
    (a.kind === 'symlink' && a.symlinkTargetKind === 'directory');
  const bIsDir = b.kind === 'directory' ||
    (b.kind === 'symlink' && b.symlinkTargetKind === 'directory');

  if (aIsDir && !bIsDir) return -1;
  if (!aIsDir && bIsDir) return 1;

  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function applyStaticFilters(
  entries: FileEntry[],
  state: { showHidden: boolean; fileTypes: FileTypeFilter; filter?: EntryFilter },
): FileEntry[] {
  let result = entries;

  // 1. Hidden files
  if (!state.showHidden) {
    result = result.filter(e => !e.isHidden);
  }

  // 2. File types
  if (state.fileTypes === 'directories') {
    result = result.filter(e => e.kind === 'directory' ||
      (e.kind === 'symlink' && e.symlinkTargetKind === 'directory'));
  }

  // 3. User-provided filter
  // Directories (and symlinks-to-directories) are exempt from user filters so
  // they remain navigable, UNLESS fileTypes is 'directories' (then the filter
  // should apply to them too).
  if (state.filter) {
    const exemptDirs = state.fileTypes !== 'directories';
    const isDirLike = (e: FileEntry) =>
      e.kind === 'directory' || (e.kind === 'symlink' && e.symlinkTargetKind === 'directory');

    if (typeof state.filter === 'string') {
      const isMatch = picomatch(state.filter);
      result = result.filter(e =>
        (exemptDirs && isDirLike(e)) || isMatch(e.name)
      );
    } else {
      const fn = state.filter;
      result = result.filter(e =>
        (exemptDirs && isDirLike(e)) || fn(e)
      );
    }
  }

  return result;
}

// --- Reducer ---

export function reducer(state: FilePickerState, action: FilePickerAction): FilePickerState {
  switch (action.type) {
    case 'load-directory':
      return {
        ...state,
        mode: 'loading',
        currentPath: action.path,
        filterText: '',
        errorMessage: undefined,
      };

    case 'load-directory-success': {
      const allEntries = applyStaticFilters(action.entries, state);
      allEntries.sort(compareEntries);

      const entryMap = new EntryMap(allEntries);
      const visibleToIndex = Math.min(allEntries.length, state.visibleEntryCount);

      return {
        ...state,
        mode: 'browsing',
        allEntries,
        filteredEntries: allEntries,
        entryMap,
        focusedEntryName: entryMap.first?.name,
        visibleFromIndex: 0,
        visibleToIndex,
        selectedPaths: state.selectedPaths,
        errorMessage: undefined,
      };
    }

    case 'load-directory-error':
      return {
        ...state,
        mode: 'error',
        errorMessage: action.error,
      };

    case 'navigate-into-directory': {
      const entry = state.entryMap.get(action.name);
      if (!entry) return state;

      // Allow navigating into directories or symlinks that point to directories
      const isNavigable = entry.kind === 'directory' ||
        (entry.kind === 'symlink' && entry.symlinkTargetKind === 'directory');
      if (!isNavigable) return state;

      const targetPath = entry.kind === 'symlink' && entry.symlinkTarget
        ? entry.symlinkTarget
        : entry.path;

      return {
        ...state,
        mode: 'loading',
        currentPath: targetPath,
        pathHistory: [...state.pathHistory, state.currentPath],
        filterText: '',
        selectedPaths: new Set<string>(),
      };
    }

    case 'navigate-to-parent': {
      // Pop from the back-stack if available (fixes symlink back-navigation),
      // otherwise fall back to dirname.
      const history = [...state.pathHistory];
      const popped = history.pop();
      const targetPath = popped ?? dirname(state.currentPath);
      if (targetPath === state.currentPath) {
        return state;
      }
      return {
        ...state,
        mode: 'loading',
        currentPath: targetPath,
        pathHistory: popped !== undefined ? history : state.pathHistory,
        filterText: '',
        selectedPaths: new Set<string>(),
      };
    }

    case 'focus-next': {
      if (!state.focusedEntryName) return state;
      const item = state.entryMap.get(state.focusedEntryName);
      if (!item?.next) return state;

      const next = item.next;
      const needsScroll = next.index >= state.visibleToIndex;

      if (!needsScroll) {
        return { ...state, focusedEntryName: next.name };
      }

      const nextVisibleTo = Math.min(state.filteredEntries.length, state.visibleToIndex + 1);
      const nextVisibleFrom = nextVisibleTo - state.visibleEntryCount;

      return {
        ...state,
        focusedEntryName: next.name,
        visibleFromIndex: Math.max(0, nextVisibleFrom),
        visibleToIndex: nextVisibleTo,
      };
    }

    case 'focus-previous': {
      if (!state.focusedEntryName) return state;
      const item = state.entryMap.get(state.focusedEntryName);
      if (!item?.previous) return state;

      const prev = item.previous;
      const needsScroll = prev.index < state.visibleFromIndex;

      if (!needsScroll) {
        return { ...state, focusedEntryName: prev.name };
      }

      const nextVisibleFrom = Math.max(0, state.visibleFromIndex - 1);
      const nextVisibleTo = nextVisibleFrom + state.visibleEntryCount;

      return {
        ...state,
        focusedEntryName: prev.name,
        visibleFromIndex: nextVisibleFrom,
        visibleToIndex: Math.min(state.filteredEntries.length, nextVisibleTo),
      };
    }

    case 'focus-first': {
      const first = state.entryMap.first;
      if (!first) return state;
      return {
        ...state,
        focusedEntryName: first.name,
        visibleFromIndex: 0,
        visibleToIndex: Math.min(state.filteredEntries.length, state.visibleEntryCount),
      };
    }

    case 'focus-last': {
      const last = state.entryMap.last;
      if (!last) return state;
      const visibleTo = state.filteredEntries.length;
      const visibleFrom = Math.max(0, visibleTo - state.visibleEntryCount);
      return {
        ...state,
        focusedEntryName: last.name,
        visibleFromIndex: visibleFrom,
        visibleToIndex: visibleTo,
      };
    }

    case 'toggle-selection': {
      if (!state.multiSelect || !state.focusedEntryName) return state;
      const entry = state.entryMap.get(state.focusedEntryName);
      if (!entry) return state;

      // Determine effective kind for symlinks
      const effectiveKind = entry.kind === 'symlink' && entry.symlinkTargetKind
        ? entry.symlinkTargetKind
        : entry.kind;
      if (state.fileTypes === 'files' && effectiveKind === 'directory') return state;
      if (state.fileTypes === 'directories' && effectiveKind === 'file') return state;

      const newSelected = new Set(state.selectedPaths);
      if (newSelected.has(entry.path)) {
        newSelected.delete(entry.path);
      } else {
        newSelected.add(entry.path);
      }
      return { ...state, selectedPaths: newSelected };
    }

    case 'select-focused-entry': {
      if (!state.focusedEntryName) return state;
      const entry = state.entryMap.get(state.focusedEntryName);
      if (!entry) return state;

      const isNavigable = entry.kind === 'directory' ||
        (entry.kind === 'symlink' && entry.symlinkTargetKind === 'directory');

      if (isNavigable) {
        return reducer(state, { type: 'navigate-into-directory', name: entry.name });
      }

      // For files: handled in the hook layer (calls onSelect)
      return state;
    }

    case 'start-filtering':
      return { ...state, mode: 'filtering', filterText: '' };

    case 'update-filter': {
      const newFilter = state.filterText + action.char;
      const filtered = state.allEntries.filter(
        e => e.name.toLowerCase().includes(newFilter.toLowerCase())
      );
      const entryMap = new EntryMap(filtered);
      const visibleTo = Math.min(filtered.length, state.visibleEntryCount);

      return {
        ...state,
        mode: 'filtering',
        filterText: newFilter,
        filteredEntries: filtered,
        entryMap,
        focusedEntryName: entryMap.first?.name,
        visibleFromIndex: 0,
        visibleToIndex: visibleTo,
      };
    }

    case 'delete-filter-char': {
      if (state.filterText.length === 0) {
        return { ...state, mode: 'browsing' };
      }
      const newFilter = state.filterText.slice(0, -1);
      const filtered = newFilter.length === 0
        ? state.allEntries
        : state.allEntries.filter(
            e => e.name.toLowerCase().includes(newFilter.toLowerCase())
          );
      const entryMap = new EntryMap(filtered);
      const visibleTo = Math.min(filtered.length, state.visibleEntryCount);

      return {
        ...state,
        filterText: newFilter,
        filteredEntries: filtered,
        entryMap,
        focusedEntryName: entryMap.first?.name,
        visibleFromIndex: 0,
        visibleToIndex: visibleTo,
        mode: newFilter.length === 0 ? 'browsing' : 'filtering',
      };
    }

    case 'clear-filter':
      return {
        ...state,
        mode: 'browsing',
        filterText: '',
        filteredEntries: state.allEntries,
        entryMap: new EntryMap(state.allEntries),
        focusedEntryName: state.allEntries[0]?.name,
        visibleFromIndex: 0,
        visibleToIndex: Math.min(state.allEntries.length, state.visibleEntryCount),
      };

    case 'retry':
      return {
        ...state,
        mode: 'loading',
        errorMessage: undefined,
      };

    case 'cancel':
      if (state.mode === 'filtering') {
        return reducer(state, { type: 'clear-filter' });
      }
      return state;
  }
}

// --- Initial State ---

type InitArgs = {
  initialPath: string;
  maxHeight: number;
  showHidden: boolean;
  showDetails: boolean;
  multiSelect: boolean;
  fileTypes: FileTypeFilter;
  filter: EntryFilter | undefined;
};

function createInitialState(args: InitArgs): FilePickerState {
  return {
    mode: 'loading',
    currentPath: args.initialPath,
    pathHistory: [],
    allEntries: [],
    filteredEntries: [],
    entryMap: new EntryMap([]),
    focusedEntryName: undefined,
    selectedPaths: new Set(),
    visibleFromIndex: 0,
    visibleToIndex: 0,
    visibleEntryCount: args.maxHeight,
    filterText: '',
    errorMessage: undefined,
    showHidden: args.showHidden,
    showDetails: args.showDetails,
    multiSelect: args.multiSelect,
    fileTypes: args.fileTypes,
    filter: args.filter,
  };
}

// --- State API ---

export type FilePickerStateAPI = {
  mode: FilePickerMode;
  currentPath: string;
  allEntries: FileEntry[];
  filteredEntries: FileEntry[];
  visibleEntries: FileEntry[];
  focusedEntryName: string | undefined;
  selectedPaths: Set<string>;
  filterText: string;
  errorMessage: string | undefined;
  visibleFromIndex: number;
  visibleToIndex: number;
  multiSelect: boolean;
  fileTypes: FileTypeFilter;

  focusNext: () => void;
  focusPrevious: () => void;
  focusFirst: () => void;
  focusLast: () => void;
  navigateToParent: () => void;
  navigateInto: (name: string) => void;
  selectFocusedEntry: () => void;
  toggleSelection: () => void;
  startFiltering: () => void;
  updateFilter: (char: string) => void;
  deleteFilterChar: () => void;
  clearFilter: () => void;
  cancel: () => void;
  retry: () => void;
  dispatch: React.Dispatch<FilePickerAction>;

  getFocusedEntry: () => FileEntry | undefined;
};

// --- Hook ---

export function useFilePickerState(props: FilePickerProps): FilePickerStateAPI {
  const {
    initialPath = process.cwd(),
    maxHeight = 10,
    showHidden = false,
    showDetails = false,
    multiSelect = false,
    fileTypes = 'all',
    filter,
  } = props;

  const [state, dispatch] = useReducer(reducer, {
    initialPath, maxHeight, showHidden, showDetails,
    multiSelect, fileTypes, filter,
  }, createInitialState);

  const focusNext = useCallback(() => dispatch({ type: 'focus-next' }), []);
  const focusPrevious = useCallback(() => dispatch({ type: 'focus-previous' }), []);
  const focusFirst = useCallback(() => dispatch({ type: 'focus-first' }), []);
  const focusLast = useCallback(() => dispatch({ type: 'focus-last' }), []);
  const navigateToParent = useCallback(() => dispatch({ type: 'navigate-to-parent' }), []);
  const navigateInto = useCallback(
    (name: string) => dispatch({ type: 'navigate-into-directory', name }),
    [],
  );
  const selectFocusedEntry = useCallback(() => dispatch({ type: 'select-focused-entry' }), []);
  const toggleSelection = useCallback(() => dispatch({ type: 'toggle-selection' }), []);
  const startFiltering = useCallback(() => dispatch({ type: 'start-filtering' }), []);
  const updateFilter = useCallback(
    (char: string) => dispatch({ type: 'update-filter', char }),
    [],
  );
  const deleteFilterChar = useCallback(() => dispatch({ type: 'delete-filter-char' }), []);
  const clearFilter = useCallback(() => dispatch({ type: 'clear-filter' }), []);
  const cancel = useCallback(() => dispatch({ type: 'cancel' }), []);
  const retry = useCallback(() => dispatch({ type: 'retry' }), []);

  const visibleEntries = useMemo(() => {
    return state.filteredEntries.slice(state.visibleFromIndex, state.visibleToIndex);
  }, [state.filteredEntries, state.visibleFromIndex, state.visibleToIndex]);

  const getFocusedEntry = useCallback((): FileEntry | undefined => {
    if (!state.focusedEntryName) return undefined;
    return state.entryMap.get(state.focusedEntryName);
  }, [state.entryMap, state.focusedEntryName]);

  return {
    mode: state.mode,
    currentPath: state.currentPath,
    allEntries: state.allEntries,
    filteredEntries: state.filteredEntries,
    visibleEntries,
    focusedEntryName: state.focusedEntryName,
    selectedPaths: state.selectedPaths,
    filterText: state.filterText,
    errorMessage: state.errorMessage,
    visibleFromIndex: state.visibleFromIndex,
    visibleToIndex: state.visibleToIndex,
    multiSelect: state.multiSelect,
    fileTypes: state.fileTypes,

    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    navigateToParent,
    navigateInto,
    selectFocusedEntry,
    toggleSelection,
    startFiltering,
    updateFilter,
    deleteFilterChar,
    clearFilter,
    cancel,
    retry,
    dispatch,

    getFocusedEntry,
  };
}
