import {realpathSync} from 'node:fs';
import process from 'node:process';
import {
  dirname,
  resolve,
  relative,
  isAbsolute,
  sep,
} from 'node:path';
import {
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import picomatch from 'picomatch';
import {EntryMap} from '../../lib/entry-map.js';
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
  /**
  Raw directory listing before static filters -- kept so config changes can re-filter.
  */
  rawEntries: FileEntry[];
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
  /**
  Sandbox root; navigation cannot go above this path. Resolved to absolute.
  */
  rootPath: string | undefined;
  /**
   Canonical (realpath) form of rootPath. Symlink targets are realpaths, so
   they are checked against this. Undefined means the same as rootPath.
   */
  rootRealPath?: string | undefined;
};

// --- Action Types ---

export type FilePickerAction =
	| {type: 'load-directory'; path: string}
	| {type: 'load-directory-success'; entries: FileEntry[]}
	| {type: 'load-directory-error'; error: string}
	| {type: 'navigate-into-directory'; name: string}
	| {type: 'navigate-to-parent'}
	| {type: 'focus-next'}
	| {type: 'focus-previous'}
	| {type: 'focus-first'}
	| {type: 'focus-last'}
	| {type: 'select-focused-entry'}
	| {type: 'toggle-selection'}
	| {type: 'start-filtering'}
	| {type: 'update-filter'; char: string}
	| {type: 'delete-filter-char'}
	| {type: 'clear-filter'}
	| {type: 'retry'}
	| {type: 'cancel'}
	| {type: 'sync-config'; config: ConfigProps};

/**
Props that may change at runtime and must stay in sync with reducer state.
*/
export type ConfigProps = {
  showHidden: boolean;
  showDetails: boolean;
  multiSelect: boolean;
  fileTypes: FileTypeFilter;
  filter: EntryFilter | undefined;
  maxHeight: number;
};

// --- Helpers ---

function compareEntries(a: FileEntry, b: FileEntry): number {
  const isDirA = a.kind === 'directory' || (a.kind === 'symlink' && a.symlinkTargetKind === 'directory');
  const isDirB = b.kind === 'directory' || (b.kind === 'symlink' && b.symlinkTargetKind === 'directory');

  if (isDirA && !isDirB) {
    return -1;
  }

  return !isDirA && isDirB ? 1 : a.name.localeCompare(b.name, undefined, {sensitivity: 'base'});
}

function applyStaticFilters(
  entries: FileEntry[],
  state: {showHidden: boolean; fileTypes: FileTypeFilter; filter?: EntryFilter},
): FileEntry[] {
  let result = entries;

  // 1. Hidden files
  if (!state.showHidden) {
    result = result.filter(entry => !entry.isHidden);
  }

  // 2. File types
  if (state.fileTypes === 'directories') {
    result = result.filter(entry => entry.kind === 'directory' || (entry.kind === 'symlink' && entry.symlinkTargetKind === 'directory'));
  }

  // 3. User-provided filter
  // Directories (and symlinks-to-directories) are exempt from user filters so
  // they remain navigable, UNLESS fileTypes is 'directories' (then the filter
  // should apply to them too).
  if (state.filter !== undefined && state.filter !== '') {
    const isExemptDirs = state.fileTypes !== 'directories';
    const isDirLike = (entry: FileEntry) =>
      entry.kind === 'directory' || (entry.kind === 'symlink' && entry.symlinkTargetKind === 'directory');

    if (typeof state.filter === 'string') {
      const isMatch = picomatch(state.filter);
      result = result.filter(entry =>
        (isExemptDirs && isDirLike(entry)) || isMatch(entry.name),
      );
    } else {
      const fn = state.filter;
      result = result.filter(entry =>
        (isExemptDirs && isDirLike(entry)) || fn(entry),
      );
    }
  }

  return result;
}

/**
Substring type-ahead filter shared by the filtering actions and config sync.
*/
function applyTextFilter(entries: FileEntry[], filterText: string): FileEntry[] {
  if (filterText.length === 0) {
    return entries;
  }

  const needle = filterText.toLowerCase();
  return entries.filter(entry => entry.name.toLowerCase().includes(needle));
}

/**
True if `target` is `root` itself or a descendant of it. `root` must be absolute.
*/
function isWithinRoot(target: string, root: string): boolean {
  const resolvedTarget = resolve(target);
  if (resolvedTarget === root) {
    return true;
  }

  const rel = relative(root, resolvedTarget);
  // `..config` is a legitimate child; only `..` itself or `../...` escapes.
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/**
 Sandbox check against either form of the root. Paths built from the
 configured root (initialPath, dirname) are compared to rootPath as given;
 symlink targets are realpaths, so they are compared to the canonical root.
 When the root itself is reached through a symlink (macOS /tmp, /var) the
 two differ, and checking only one would refuse in-root symlinks.
 */
function isWithinSandbox(
  target: string,
  {rootPath, rootRealPath}: Pick<FilePickerState, 'rootPath' | 'rootRealPath'>,
): boolean {
  const isInConfiguredRoot = rootPath === undefined || rootPath === '' || isWithinRoot(target, rootPath);
  return isInConfiguredRoot || (rootRealPath !== undefined && rootRealPath !== rootPath && isWithinRoot(target, rootRealPath));
}

/**
Realpath of `path`, or `path` itself when it cannot be resolved (e.g. missing).
*/
function canonicalize(path: string): string {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

/**
Shallow equality by entry identity (path), order-sensitive.
*/
function haveSameEntries(a: FileEntry[], b: FileEntry[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (const [i, element] of a.entries()) {
    if (element!.path !== b[i]!.path) {
      return false;
    }
  }

  return true;
}

// --- Reducer ---

function navigateIntoDirectory(state: FilePickerState, name: string): FilePickerState {
  const entry = state.entryMap.get(name);
  if (!entry) {
    return state;
  }

  // Allow navigating into directories or symlinks that point to directories
  const isNavigable = entry.kind === 'directory' || (entry.kind === 'symlink' && entry.symlinkTargetKind === 'directory');
  if (!isNavigable) {
    return state;
  }

  const targetPath = entry.kind === 'symlink' && entry.symlinkTarget !== undefined && entry.symlinkTarget !== ''
    ? entry.symlinkTarget
    : entry.path;

  // Sandbox: a symlink target is an absolute realpath that can point
  // anywhere, so refuse to follow one that escapes rootPath.
  if (!isWithinSandbox(targetPath, state)) {
    return state;
  }

  return {
    ...state,
    mode: 'loading',
    currentPath: targetPath,
    pathHistory: [...state.pathHistory, state.currentPath],
    filterText: '',
    selectedPaths: new Set<string>(),
  };
}

export function reducer(state: FilePickerState, action: FilePickerAction): FilePickerState {
  switch (action.type) {
    case 'load-directory': {
      // A fresh navigation to an explicit path (e.g. initialPath changed):
      // reset history and selection. Clamp into rootPath so a new initialPath
      // outside the sandbox cannot escape it.
      const targetPath = state.rootPath !== undefined && state.rootPath !== '' && !isWithinSandbox(action.path, state)
        ? state.rootPath
        : action.path;
      return {
        ...state,
        mode: 'loading',
        currentPath: targetPath,
        pathHistory: [],
        selectedPaths: new Set<string>(),
        filterText: '',
        errorMessage: undefined,
      };
    }

    case 'load-directory-success': {
      const allEntries = applyStaticFilters(action.entries, state);
      allEntries.sort(compareEntries);

      const entryMap = new EntryMap(allEntries);
      const visibleToIndex = Math.min(allEntries.length, state.visibleEntryCount);

      return {
        ...state,
        mode: 'browsing',
        rawEntries: action.entries,
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

    case 'load-directory-error': {
      return {
        ...state,
        mode: 'error',
        errorMessage: action.error,
      };
    }

    case 'navigate-into-directory': {
      return navigateIntoDirectory(state, action.name);
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

      // Sandbox: refuse to navigate above rootPath.
      if (!isWithinSandbox(targetPath, state)) {
        return state;
      }

      return {
        ...state,
        mode: 'loading',
        currentPath: targetPath,
        pathHistory: popped === undefined ? state.pathHistory : history,
        filterText: '',
        selectedPaths: new Set<string>(),
      };
    }

    case 'focus-next': {
      if (state.focusedEntryName === undefined || state.focusedEntryName === '') {
        return state;
      }

      const item = state.entryMap.get(state.focusedEntryName);
      if (!item?.next) {
        return state;
      }

      const {next} = item;
      const isNeedsScroll = next.index >= state.visibleToIndex;

      if (!isNeedsScroll) {
        return {...state, focusedEntryName: next.name};
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
      if (state.focusedEntryName === undefined || state.focusedEntryName === '') {
        return state;
      }

      const item = state.entryMap.get(state.focusedEntryName);
      if (!item?.previous) {
        return state;
      }

      const {previous} = item;
      const isNeedsScroll = previous.index < state.visibleFromIndex;

      if (!isNeedsScroll) {
        return {...state, focusedEntryName: previous.name};
      }

      const nextVisibleFrom = Math.max(0, state.visibleFromIndex - 1);
      const nextVisibleTo = nextVisibleFrom + state.visibleEntryCount;

      return {
        ...state,
        focusedEntryName: previous.name,
        visibleFromIndex: nextVisibleFrom,
        visibleToIndex: Math.min(state.filteredEntries.length, nextVisibleTo),
      };
    }

    case 'focus-first': {
      const {first} = state.entryMap;
      if (!first) {
        return state;
      }

      return {
        ...state,
        focusedEntryName: first.name,
        visibleFromIndex: 0,
        visibleToIndex: Math.min(state.filteredEntries.length, state.visibleEntryCount),
      };
    }

    case 'focus-last': {
      const {last} = state.entryMap;
      if (!last) {
        return state;
      }

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
      if (!state.multiSelect || state.focusedEntryName === undefined || state.focusedEntryName === '') {
        return state;
      }

      const entry = state.entryMap.get(state.focusedEntryName);
      if (!entry) {
        return state;
      }

      // Determine effective kind for symlinks
      const effectiveKind = entry.kind === 'symlink' && entry.symlinkTargetKind !== undefined
        ? entry.symlinkTargetKind
        : entry.kind;
      if (effectiveKind === 'directory' && state.fileTypes === 'files') {
        return state;
      }

      if (effectiveKind === 'file' && state.fileTypes === 'directories') {
        return state;
      }

      const newSelected = new Set(state.selectedPaths);
      if (newSelected.has(entry.path)) {
        newSelected.delete(entry.path);
      } else {
        newSelected.add(entry.path);
      }

      return {...state, selectedPaths: newSelected};
    }

    case 'select-focused-entry': {
      if (state.focusedEntryName === undefined || state.focusedEntryName === '') {
        return state;
      }

      const entry = state.entryMap.get(state.focusedEntryName);
      if (!entry) {
        return state;
      }

      const isNavigable = entry.kind === 'directory' || (entry.kind === 'symlink' && entry.symlinkTargetKind === 'directory');

      // For files: handled in the hook layer (calls onSelect)
      return isNavigable ? navigateIntoDirectory(state, entry.name) : state;
    }

    case 'start-filtering': {
      return {...state, mode: 'filtering', filterText: ''};
    }

    case 'update-filter': {
      const newFilter = state.filterText + action.char;
      const filtered = state.allEntries.filter(
        entry => entry.name.toLowerCase().includes(newFilter.toLowerCase()),
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
        return {...state, mode: 'browsing'};
      }

      const newFilter = state.filterText.slice(0, -1);
      const filtered = newFilter.length === 0
        ? state.allEntries
        : state.allEntries.filter(
          entry => entry.name.toLowerCase().includes(newFilter.toLowerCase()),
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

    case 'clear-filter': {
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
    }

    case 'retry': {
      return {
        ...state,
        mode: 'loading',
        errorMessage: undefined,
      };
    }

    case 'cancel': {
      return state.mode === 'filtering' ? reducer(state, {type: 'clear-filter'}) : state;
    }

    case 'sync-config': {
      const {showHidden, showDetails, multiSelect, fileTypes, filter, maxHeight} = action.config;

      // Re-derive the visible listing from the raw directory contents using the
      // new config, preserving any active type-ahead filter.
      const allEntries = applyStaticFilters(state.rawEntries, {showHidden, fileTypes, filter});
      allEntries.sort(compareEntries);
      const filteredEntries = applyTextFilter(allEntries, state.filterText);

      const isScalarsUnchanged =
        state.showHidden === showHidden &&
        state.showDetails === showDetails &&
        state.multiSelect === multiSelect &&
        state.fileTypes === fileTypes &&
        state.visibleEntryCount === maxHeight;

      // No effective change (e.g. an inline filter function with identical
      // behavior re-created each render) -- return the same reference so React
      // bails out and we avoid a render loop.
      if (
        isScalarsUnchanged &&
        haveSameEntries(state.allEntries, allEntries) &&
        haveSameEntries(state.filteredEntries, filteredEntries)
      ) {
        return state;
      }

      const entryMap = new EntryMap(filteredEntries);
      const focusedIndex = filteredEntries.findIndex(entry => entry.name === state.focusedEntryName);
      const isFocusSurvives = focusedIndex !== -1;
      const focusedEntryName = isFocusSurvives ? state.focusedEntryName : entryMap.first?.name;

      // Keep the focused row on-screen: preserve the old scroll offset when it
      // still contains the focused index, otherwise clamp the window around it.
      // Reset to the top only when the focused entry no longer exists.
      let visibleFromIndex = 0;
      if (isFocusSurvives) {
        visibleFromIndex = state.visibleFromIndex;
        if (focusedIndex < visibleFromIndex) {
          visibleFromIndex = focusedIndex;
        } else if (focusedIndex >= visibleFromIndex + maxHeight) {
          visibleFromIndex = focusedIndex - maxHeight + 1;
        }

        visibleFromIndex = Math.max(0, Math.min(visibleFromIndex, Math.max(0, filteredEntries.length - maxHeight)));
      }

      const visibleToIndex = Math.min(filteredEntries.length, visibleFromIndex + maxHeight);

      // Drop selections no longer present in the statically-filtered list (a
      // filter/fileTypes/showHidden change made them non-selectable); type-ahead
      // narrowing does not prune because it does not affect allEntries.
      let {selectedPaths} = state;
      if (selectedPaths.size > 0) {
        const visiblePaths = new Set(allEntries.map(entry => entry.path));
        // `difference` keeps the receiver's order, so selections stay in the order made.
        const dropped = selectedPaths.difference(visiblePaths);
        if (dropped.size > 0) {
          selectedPaths = selectedPaths.difference(dropped);
        }
      }

      return {
        ...state,
        showHidden,
        showDetails,
        multiSelect,
        fileTypes,
        filter,
        visibleEntryCount: maxHeight,
        allEntries,
        filteredEntries,
        entryMap,
        focusedEntryName,
        selectedPaths,
        visibleFromIndex,
        visibleToIndex,
      };
    }
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
  /**
  Sandbox root; navigation cannot go above this path. Resolved to absolute.
  */
  rootPath: string | undefined;
};

function createInitialState(args: InitArgs): FilePickerState {
  const rootPath = args.rootPath === undefined || args.rootPath === '' ? undefined : resolve(args.rootPath);
  const rootRealPath = rootPath === undefined || rootPath === '' ? undefined : canonicalize(rootPath);
  // Clamp the starting path into the sandbox: an initialPath outside rootPath
  // falls back to rootPath itself.
  const currentPath = rootPath !== undefined && rootPath !== '' && !isWithinSandbox(args.initialPath, {rootPath, rootRealPath})
    ? rootPath
    : args.initialPath;

  return {
    mode: 'loading',
    currentPath,
    pathHistory: [],
    rawEntries: [],
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
    rootPath,
    rootRealPath,
  };
}

// --- State API ---

// eslint-disable-next-line @typescript-eslint/naming-convention -- published type name; renaming would break consumers.
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
  showDetails: boolean;
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
    rootPath,
  } = props;

  const [state, dispatch] = useReducer(reducer, {
    initialPath, maxHeight, showHidden, showDetails,
    multiSelect, fileTypes, filter, rootPath,
  }, createInitialState);

  // Keep reducer state in sync with config props that may change after mount.
  // sync-config re-derives the filtered listing and returns the same state
  // reference when nothing effectively changed, so an inline `filter` function
  // re-created each render does not cause a render loop.
  useEffect(() => {
    dispatch({
      type: 'sync-config',
      config: {
        showHidden, showDetails, multiSelect, fileTypes, filter, maxHeight,
      },
    });
  }, [showHidden, showDetails, multiSelect, fileTypes, filter, maxHeight]);

  // Navigate to a new initialPath when it changes (but not on first mount --
  // createInitialState already seeded currentPath from it).
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    dispatch({type: 'load-directory', path: initialPath});
  }, [initialPath]);

  const focusNext = useCallback(() => {
    dispatch({type: 'focus-next'});
  }, []);
  const focusPrevious = useCallback(() => {
    dispatch({type: 'focus-previous'});
  }, []);
  const focusFirst = useCallback(() => {
    dispatch({type: 'focus-first'});
  }, []);
  const focusLast = useCallback(() => {
    dispatch({type: 'focus-last'});
  }, []);
  const navigateToParent = useCallback(() => {
    dispatch({type: 'navigate-to-parent'});
  }, []);
  const navigateInto = useCallback(
    (name: string) => {
      dispatch({type: 'navigate-into-directory', name});
    },
    [],
  );
  const selectFocusedEntry = useCallback(() => {
    dispatch({type: 'select-focused-entry'});
  }, []);
  const toggleSelection = useCallback(() => {
    dispatch({type: 'toggle-selection'});
  }, []);
  const startFiltering = useCallback(() => {
    dispatch({type: 'start-filtering'});
  }, []);
  const updateFilter = useCallback(
    (char: string) => {
      dispatch({type: 'update-filter', char});
    },
    [],
  );
  const deleteFilterChar = useCallback(() => {
    dispatch({type: 'delete-filter-char'});
  }, []);
  const clearFilter = useCallback(() => {
    dispatch({type: 'clear-filter'});
  }, []);
  const cancel = useCallback(() => {
    dispatch({type: 'cancel'});
  }, []);
  const retry = useCallback(() => {
    dispatch({type: 'retry'});
  }, []);

  const visibleEntries = useMemo(() => state.filteredEntries.slice(state.visibleFromIndex, state.visibleToIndex), [state.filteredEntries, state.visibleFromIndex, state.visibleToIndex]);

  const getFocusedEntry = useCallback(
    (): FileEntry | undefined => state.focusedEntryName === undefined || state.focusedEntryName === ''
      ? undefined
      : state.entryMap.get(state.focusedEntryName),
    [state.entryMap, state.focusedEntryName],
  );

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
    showDetails: state.showDetails,
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
