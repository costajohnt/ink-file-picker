import { describe, it, expect } from 'vitest';
import { reducer, type FilePickerState } from '../src/components/file-picker/use-file-picker-state.js';
import { EntryMap } from '../src/lib/entry-map.js';
import type { FileEntry } from '../src/types.js';

function makeEntry(name: string, kind: FileEntry['kind'] = 'file', overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    name,
    path: `/mock/${name}`,
    kind,
    size: kind === 'file' ? 100 : 0,
    modifiedAt: 1000,
    isHidden: name.startsWith('.'),
    ...overrides,
  };
}

function makeBrowsingState(entries: FileEntry[], overrides: Partial<FilePickerState> = {}): FilePickerState {
  const sorted = [...entries];
  const entryMap = new EntryMap(sorted);
  return {
    mode: 'browsing',
    currentPath: '/mock',
    pathHistory: [],
    allEntries: sorted,
    filteredEntries: sorted,
    entryMap,
    focusedEntryName: entryMap.first?.name,
    selectedPaths: new Set(),
    visibleFromIndex: 0,
    visibleToIndex: Math.min(sorted.length, 10),
    visibleEntryCount: 10,
    filterText: '',
    errorMessage: undefined,
    showHidden: false,
    showDetails: false,
    multiSelect: false,
    fileTypes: 'all',
    filter: undefined,
    ...overrides,
  };
}

function makeLoadingState(overrides: Partial<FilePickerState> = {}): FilePickerState {
  return {
    mode: 'loading',
    currentPath: '/mock',
    pathHistory: [],
    allEntries: [],
    filteredEntries: [],
    entryMap: new EntryMap([]),
    focusedEntryName: undefined,
    selectedPaths: new Set(),
    visibleFromIndex: 0,
    visibleToIndex: 0,
    visibleEntryCount: 10,
    filterText: '',
    errorMessage: undefined,
    showHidden: false,
    showDetails: false,
    multiSelect: false,
    fileTypes: 'all',
    filter: undefined,
    ...overrides,
  };
}

describe('reducer', () => {
  describe('load-directory-success', () => {
    it('populates allEntries and filteredEntries from raw entries', () => {
      const state = makeLoadingState();
      const entries = [makeEntry('file.ts'), makeEntry('src', 'directory')];

      const next = reducer(state, { type: 'load-directory-success', entries });

      expect(next.allEntries.length).toBe(2);
      expect(next.filteredEntries.length).toBe(2);
    });

    it('sorts directories before files', () => {
      const state = makeLoadingState();
      const entries = [makeEntry('file.ts'), makeEntry('src', 'directory'), makeEntry('app', 'directory')];

      const next = reducer(state, { type: 'load-directory-success', entries });

      expect(next.allEntries[0]?.kind).toBe('directory');
      expect(next.allEntries[1]?.kind).toBe('directory');
      expect(next.allEntries[2]?.kind).toBe('file');
    });

    it('sorts alphabetically within each kind', () => {
      const state = makeLoadingState();
      const entries = [makeEntry('zebra.ts'), makeEntry('alpha.ts'), makeEntry('src', 'directory'), makeEntry('app', 'directory')];

      const next = reducer(state, { type: 'load-directory-success', entries });

      expect(next.allEntries[0]?.name).toBe('app');
      expect(next.allEntries[1]?.name).toBe('src');
      expect(next.allEntries[2]?.name).toBe('alpha.ts');
      expect(next.allEntries[3]?.name).toBe('zebra.ts');
    });

    it('filters hidden files when showHidden is false', () => {
      const state = makeLoadingState({ showHidden: false });
      const entries = [makeEntry('.hidden'), makeEntry('visible.ts')];

      const next = reducer(state, { type: 'load-directory-success', entries });

      expect(next.allEntries.length).toBe(1);
      expect(next.allEntries[0]?.name).toBe('visible.ts');
    });

    it('keeps hidden files when showHidden is true', () => {
      const state = makeLoadingState({ showHidden: true });
      const entries = [makeEntry('.hidden'), makeEntry('visible.ts')];

      const next = reducer(state, { type: 'load-directory-success', entries });

      expect(next.allEntries.length).toBe(2);
    });

    it('applies glob filter from filter prop', () => {
      const state = makeLoadingState({ filter: '*.ts' });
      const entries = [
        makeEntry('index.ts'),
        makeEntry('style.css'),
        makeEntry('src', 'directory'),
      ];

      const next = reducer(state, { type: 'load-directory-success', entries });

      // Directories always kept; only *.ts files pass
      const names = next.allEntries.map(e => e.name);
      expect(names).toContain('src');
      expect(names).toContain('index.ts');
      expect(names).not.toContain('style.css');
    });

    it('applies function filter from filter prop', () => {
      const state = makeLoadingState({
        filter: (entry: FileEntry) => entry.name.endsWith('.ts'),
      });
      const entries = [
        makeEntry('index.ts'),
        makeEntry('style.css'),
        makeEntry('src', 'directory'),
      ];

      const next = reducer(state, { type: 'load-directory-success', entries });

      const names = next.allEntries.map(e => e.name);
      expect(names).toContain('src');
      expect(names).toContain('index.ts');
      expect(names).not.toContain('style.css');
    });

    it('applies glob filter to directories when fileTypes is directories', () => {
      const state = makeLoadingState({ filter: 's*', fileTypes: 'directories' });
      const entries = [
        makeEntry('src', 'directory'),
        makeEntry('scripts', 'directory'),
        makeEntry('dist', 'directory'),
        makeEntry('index.ts'),
      ];

      const next = reducer(state, { type: 'load-directory-success', entries });

      const names = next.allEntries.map(e => e.name);
      expect(names).toContain('src');
      expect(names).toContain('scripts');
      expect(names).not.toContain('dist');
      expect(names).not.toContain('index.ts');
    });

    it('applies function filter to directories when fileTypes is directories', () => {
      const state = makeLoadingState({
        filter: (entry: FileEntry) => entry.name.startsWith('s'),
        fileTypes: 'directories',
      });
      const entries = [
        makeEntry('src', 'directory'),
        makeEntry('dist', 'directory'),
        makeEntry('index.ts'),
      ];

      const next = reducer(state, { type: 'load-directory-success', entries });

      const names = next.allEntries.map(e => e.name);
      expect(names).toContain('src');
      expect(names).not.toContain('dist');
      expect(names).not.toContain('index.ts');
    });

    it('sets focusedEntryName to first entry', () => {
      const state = makeLoadingState();
      const entries = [makeEntry('alpha.ts'), makeEntry('beta.ts')];

      const next = reducer(state, { type: 'load-directory-success', entries });

      expect(next.focusedEntryName).toBe('alpha.ts');
    });

    it('sets mode to browsing', () => {
      const state = makeLoadingState();
      const entries = [makeEntry('file.ts')];

      const next = reducer(state, { type: 'load-directory-success', entries });

      expect(next.mode).toBe('browsing');
    });

    it('preserves empty filter text from loading transition', () => {
      // filterText is cleared when entering loading mode (via load-directory),
      // so by the time load-directory-success fires, it should already be ''
      const state = makeLoadingState({ filterText: '' });
      const entries = [makeEntry('file.ts')];

      const next = reducer(state, { type: 'load-directory-success', entries });

      expect(next.filterText).toBe('');
    });

    it('load-directory clears filter text before loading', () => {
      const state = makeBrowsingState([makeEntry('file.ts')], { filterText: 'old filter' });

      const next = reducer(state, { type: 'load-directory', path: '/new-path' });

      expect(next.filterText).toBe('');
      expect(next.mode).toBe('loading');
    });
  });

  describe('load-directory-error', () => {
    it('sets mode to error', () => {
      const state = makeLoadingState();
      const next = reducer(state, { type: 'load-directory-error', error: 'EACCES' });
      expect(next.mode).toBe('error');
    });

    it('stores error message', () => {
      const state = makeLoadingState();
      const next = reducer(state, { type: 'load-directory-error', error: 'Permission denied' });
      expect(next.errorMessage).toBe('Permission denied');
    });
  });

  describe('focus-next', () => {
    it('moves focus to next entry', () => {
      const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];
      const state = makeBrowsingState(entries, { focusedEntryName: 'a' });

      const next = reducer(state, { type: 'focus-next' });

      expect(next.focusedEntryName).toBe('b');
    });

    it('does nothing when at last entry', () => {
      const entries = [makeEntry('a'), makeEntry('b')];
      const state = makeBrowsingState(entries, { focusedEntryName: 'b' });

      const next = reducer(state, { type: 'focus-next' });

      expect(next.focusedEntryName).toBe('b');
    });

    it('scrolls visible window down when focus exceeds visibleToIndex', () => {
      const entries = Array.from({ length: 15 }, (_, i) => makeEntry(`file-${String(i).padStart(2, '0')}`));
      const state = makeBrowsingState(entries, {
        focusedEntryName: 'file-09',
        visibleFromIndex: 0,
        visibleToIndex: 10,
        visibleEntryCount: 10,
      });

      const next = reducer(state, { type: 'focus-next' });

      expect(next.focusedEntryName).toBe('file-10');
      expect(next.visibleToIndex).toBe(11);
      expect(next.visibleFromIndex).toBe(1);
    });
  });

  describe('focus-previous', () => {
    it('moves focus to previous entry', () => {
      const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];
      const state = makeBrowsingState(entries, { focusedEntryName: 'b' });

      const next = reducer(state, { type: 'focus-previous' });

      expect(next.focusedEntryName).toBe('a');
    });

    it('does nothing when at first entry', () => {
      const entries = [makeEntry('a'), makeEntry('b')];
      const state = makeBrowsingState(entries, { focusedEntryName: 'a' });

      const next = reducer(state, { type: 'focus-previous' });

      expect(next.focusedEntryName).toBe('a');
    });

    it('scrolls visible window up when focus is below visibleFromIndex', () => {
      const entries = Array.from({ length: 15 }, (_, i) => makeEntry(`file-${String(i).padStart(2, '0')}`));
      const state = makeBrowsingState(entries, {
        focusedEntryName: 'file-05',
        visibleFromIndex: 5,
        visibleToIndex: 15,
        visibleEntryCount: 10,
      });

      const next = reducer(state, { type: 'focus-previous' });

      expect(next.focusedEntryName).toBe('file-04');
      expect(next.visibleFromIndex).toBe(4);
      expect(next.visibleToIndex).toBe(14);
    });
  });

  describe('focus-first', () => {
    it('jumps to first entry', () => {
      const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];
      const state = makeBrowsingState(entries, { focusedEntryName: 'c' });

      const next = reducer(state, { type: 'focus-first' });

      expect(next.focusedEntryName).toBe('a');
    });

    it('resets visible window to top', () => {
      const entries = Array.from({ length: 15 }, (_, i) => makeEntry(`file-${i}`));
      const state = makeBrowsingState(entries, {
        focusedEntryName: 'file-14',
        visibleFromIndex: 5,
        visibleToIndex: 15,
      });

      const next = reducer(state, { type: 'focus-first' });

      expect(next.visibleFromIndex).toBe(0);
      expect(next.visibleToIndex).toBe(10);
    });
  });

  describe('focus-last', () => {
    it('jumps to last entry', () => {
      const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];
      const state = makeBrowsingState(entries, { focusedEntryName: 'a' });

      const next = reducer(state, { type: 'focus-last' });

      expect(next.focusedEntryName).toBe('c');
    });

    it('sets visible window to bottom', () => {
      const entries = Array.from({ length: 15 }, (_, i) => makeEntry(`file-${i}`));
      const state = makeBrowsingState(entries, {
        focusedEntryName: 'file-0',
        visibleFromIndex: 0,
        visibleToIndex: 10,
      });

      const next = reducer(state, { type: 'focus-last' });

      expect(next.visibleFromIndex).toBe(5);
      expect(next.visibleToIndex).toBe(15);
    });
  });

  describe('navigate-into-directory', () => {
    it('sets mode to loading', () => {
      const entries = [makeEntry('src', 'directory'), makeEntry('file.ts')];
      const state = makeBrowsingState(entries);

      const next = reducer(state, { type: 'navigate-into-directory', name: 'src' });

      expect(next.mode).toBe('loading');
    });

    it('updates currentPath to the directory full path', () => {
      const entries = [makeEntry('src', 'directory'), makeEntry('file.ts')];
      const state = makeBrowsingState(entries);

      const next = reducer(state, { type: 'navigate-into-directory', name: 'src' });

      expect(next.currentPath).toBe('/mock/src');
    });

    it('pushes old path onto pathHistory', () => {
      const entries = [makeEntry('src', 'directory')];
      const state = makeBrowsingState(entries, { currentPath: '/mock' });

      const next = reducer(state, { type: 'navigate-into-directory', name: 'src' });

      expect(next.pathHistory).toContain('/mock');
    });

    it('clears filter text', () => {
      const entries = [makeEntry('src', 'directory')];
      const state = makeBrowsingState(entries, { filterText: 'some filter' });

      const next = reducer(state, { type: 'navigate-into-directory', name: 'src' });

      expect(next.filterText).toBe('');
    });

    it('does nothing for files', () => {
      const entries = [makeEntry('file.ts')];
      const state = makeBrowsingState(entries);

      const next = reducer(state, { type: 'navigate-into-directory', name: 'file.ts' });

      expect(next.mode).toBe('browsing');
      expect(next.currentPath).toBe('/mock');
    });

    it('clears selectedPaths when navigating into directory', () => {
      const entries = [makeEntry('src', 'directory'), makeEntry('file.ts')];
      const state = makeBrowsingState(entries, {
        multiSelect: true,
        selectedPaths: new Set(['/mock/file.ts']),
      });

      const next = reducer(state, { type: 'navigate-into-directory', name: 'src' });

      expect(next.selectedPaths.size).toBe(0);
    });
  });

  describe('navigate-to-parent', () => {
    it('sets currentPath to parent directory', () => {
      const state = makeBrowsingState([], { currentPath: '/mock/deep/path' });

      const next = reducer(state, { type: 'navigate-to-parent' });

      expect(next.currentPath).toBe('/mock/deep');
      expect(next.mode).toBe('loading');
    });

    it('no-op when at filesystem root', () => {
      const state = makeBrowsingState([], { currentPath: '/' });

      const next = reducer(state, { type: 'navigate-to-parent' });

      expect(next.currentPath).toBe('/');
      expect(next.mode).toBe('browsing');
    });

    it('clears selectedPaths when navigating to parent', () => {
      const state = makeBrowsingState([], {
        currentPath: '/mock/deep/path',
        multiSelect: true,
        selectedPaths: new Set(['/mock/deep/path/file.ts']),
      });

      const next = reducer(state, { type: 'navigate-to-parent' });

      expect(next.selectedPaths.size).toBe(0);
    });
  });

  describe('toggle-selection', () => {
    it('adds entry path to selectedPaths when not selected', () => {
      const entries = [makeEntry('file.ts')];
      const state = makeBrowsingState(entries, {
        multiSelect: true,
        focusedEntryName: 'file.ts',
      });

      const next = reducer(state, { type: 'toggle-selection' });

      expect(next.selectedPaths.has('/mock/file.ts')).toBe(true);
    });

    it('removes entry path from selectedPaths when already selected', () => {
      const entries = [makeEntry('file.ts')];
      const state = makeBrowsingState(entries, {
        multiSelect: true,
        focusedEntryName: 'file.ts',
        selectedPaths: new Set(['/mock/file.ts']),
      });

      const next = reducer(state, { type: 'toggle-selection' });

      expect(next.selectedPaths.has('/mock/file.ts')).toBe(false);
    });

    it('no-op in single-select mode', () => {
      const entries = [makeEntry('file.ts')];
      const state = makeBrowsingState(entries, {
        multiSelect: false,
        focusedEntryName: 'file.ts',
      });

      const next = reducer(state, { type: 'toggle-selection' });

      expect(next.selectedPaths.size).toBe(0);
    });

    it('respects fileTypes restriction (cannot select dir in files-only mode)', () => {
      const entries = [makeEntry('src', 'directory')];
      const state = makeBrowsingState(entries, {
        multiSelect: true,
        focusedEntryName: 'src',
        fileTypes: 'files',
      });

      const next = reducer(state, { type: 'toggle-selection' });

      expect(next.selectedPaths.size).toBe(0);
    });

    it('allows selecting symlink-to-file in files-only mode', () => {
      const entries = [makeEntry('link-to-file', 'symlink', {
        symlinkTarget: '/real/file.ts',
        symlinkTargetKind: 'file',
      })];
      const state = makeBrowsingState(entries, {
        multiSelect: true,
        focusedEntryName: 'link-to-file',
        fileTypes: 'files',
      });

      const next = reducer(state, { type: 'toggle-selection' });

      expect(next.selectedPaths.has('/mock/link-to-file')).toBe(true);
    });

    it('blocks symlink-to-directory in files-only mode', () => {
      const entries = [makeEntry('link-to-dir', 'symlink', {
        symlinkTarget: '/real/dir',
        symlinkTargetKind: 'directory',
      })];
      const state = makeBrowsingState(entries, {
        multiSelect: true,
        focusedEntryName: 'link-to-dir',
        fileTypes: 'files',
      });

      const next = reducer(state, { type: 'toggle-selection' });

      expect(next.selectedPaths.size).toBe(0);
    });

    it('allows selecting symlink-to-directory in directories-only mode', () => {
      const entries = [makeEntry('link-to-dir', 'symlink', {
        symlinkTarget: '/real/dir',
        symlinkTargetKind: 'directory',
      })];
      const state = makeBrowsingState(entries, {
        multiSelect: true,
        focusedEntryName: 'link-to-dir',
        fileTypes: 'directories',
      });

      const next = reducer(state, { type: 'toggle-selection' });

      expect(next.selectedPaths.has('/mock/link-to-dir')).toBe(true);
    });

    it('blocks symlink-to-file in directories-only mode', () => {
      const entries = [makeEntry('link-to-file', 'symlink', {
        symlinkTarget: '/real/file.ts',
        symlinkTargetKind: 'file',
      })];
      const state = makeBrowsingState(entries, {
        multiSelect: true,
        focusedEntryName: 'link-to-file',
        fileTypes: 'directories',
      });

      const next = reducer(state, { type: 'toggle-selection' });

      expect(next.selectedPaths.size).toBe(0);
    });
  });

  describe('start-filtering', () => {
    it('sets mode to filtering', () => {
      const state = makeBrowsingState([makeEntry('file.ts')]);

      const next = reducer(state, { type: 'start-filtering' });

      expect(next.mode).toBe('filtering');
    });

    it('clears filter text', () => {
      const state = makeBrowsingState([makeEntry('file.ts')], { filterText: 'old' });

      const next = reducer(state, { type: 'start-filtering' });

      expect(next.filterText).toBe('');
    });
  });

  describe('update-filter', () => {
    it('appends character to filterText', () => {
      const entries = [makeEntry('abc.ts'), makeEntry('xyz.ts')];
      const state = makeBrowsingState(entries, { mode: 'filtering', filterText: 'a' });

      const next = reducer(state, { type: 'update-filter', char: 'b' });

      expect(next.filterText).toBe('ab');
    });

    it('recomputes filteredEntries with case-insensitive match', () => {
      const entries = [makeEntry('README.md'), makeEntry('index.ts'), makeEntry('src', 'directory')];
      const state = makeBrowsingState(entries, { mode: 'filtering', filterText: '' });

      const next = reducer(state, { type: 'update-filter', char: 'r' });

      const names = next.filteredEntries.map(e => e.name);
      expect(names).toContain('README.md');
      expect(names).toContain('src');
      expect(names).not.toContain('index.ts');
    });

    it('resets focus to first matching entry', () => {
      const entries = [makeEntry('alpha.ts'), makeEntry('beta.ts'), makeEntry('gamma.ts')];
      const state = makeBrowsingState(entries, { mode: 'filtering', filterText: '' });

      const next = reducer(state, { type: 'update-filter', char: 'b' });

      expect(next.focusedEntryName).toBe('beta.ts');
    });

    it('resets visible window to top', () => {
      const entries = Array.from({ length: 15 }, (_, i) => makeEntry(`file-${i}`));
      const state = makeBrowsingState(entries, {
        mode: 'filtering',
        filterText: '',
        visibleFromIndex: 5,
        visibleToIndex: 15,
      });

      const next = reducer(state, { type: 'update-filter', char: '0' });

      expect(next.visibleFromIndex).toBe(0);
    });
  });

  describe('delete-filter-char', () => {
    it('removes last character from filterText', () => {
      const entries = [makeEntry('abc.ts')];
      const state = makeBrowsingState(entries, { mode: 'filtering', filterText: 'abc' });

      const next = reducer(state, { type: 'delete-filter-char' });

      expect(next.filterText).toBe('ab');
    });

    it('exits filter mode when filterText becomes empty', () => {
      const entries = [makeEntry('file.ts')];
      const state = makeBrowsingState(entries, { mode: 'filtering', filterText: 'a' });

      const next = reducer(state, { type: 'delete-filter-char' });

      expect(next.filterText).toBe('');
      expect(next.mode).toBe('browsing');
    });

    it('exits to browsing when filterText is already empty', () => {
      const entries = [makeEntry('file.ts')];
      const state = makeBrowsingState(entries, { mode: 'filtering', filterText: '' });

      const next = reducer(state, { type: 'delete-filter-char' });

      expect(next.mode).toBe('browsing');
    });

    it('recomputes filteredEntries', () => {
      const entries = [makeEntry('abc.ts'), makeEntry('xyz.ts')];
      const state = makeBrowsingState(entries, { mode: 'filtering', filterText: 'ab' });

      const next = reducer(state, { type: 'delete-filter-char' });

      // filter is now 'a' -- abc.ts matches, xyz.ts does not
      expect(next.filteredEntries.map(e => e.name)).toContain('abc.ts');
    });
  });

  describe('clear-filter', () => {
    it('resets filterText to empty', () => {
      const entries = [makeEntry('file.ts')];
      const state = makeBrowsingState(entries, { mode: 'filtering', filterText: 'search' });

      const next = reducer(state, { type: 'clear-filter' });

      expect(next.filterText).toBe('');
    });

    it('sets mode to browsing', () => {
      const entries = [makeEntry('file.ts')];
      const state = makeBrowsingState(entries, { mode: 'filtering', filterText: 'x' });

      const next = reducer(state, { type: 'clear-filter' });

      expect(next.mode).toBe('browsing');
    });

    it('restores filteredEntries to allEntries', () => {
      const entries = [makeEntry('abc.ts'), makeEntry('xyz.ts')];
      const state = makeBrowsingState(entries, {
        mode: 'filtering',
        filterText: 'abc',
        filteredEntries: [entries[0]!],
      });

      const next = reducer(state, { type: 'clear-filter' });

      expect(next.filteredEntries.length).toBe(2);
    });
  });

  describe('select-focused-entry', () => {
    it('navigates into directory when focused on a directory', () => {
      const entries = [makeEntry('src', 'directory'), makeEntry('file.ts')];
      const state = makeBrowsingState(entries, { focusedEntryName: 'src' });

      const next = reducer(state, { type: 'select-focused-entry' });

      expect(next.mode).toBe('loading');
      expect(next.currentPath).toBe('/mock/src');
    });

    it('does not change state for files (handled in hook layer)', () => {
      const entries = [makeEntry('file.ts')];
      const state = makeBrowsingState(entries, { focusedEntryName: 'file.ts' });

      const next = reducer(state, { type: 'select-focused-entry' });

      expect(next.mode).toBe('browsing');
    });
  });

  describe('retry', () => {
    it('sets mode to loading', () => {
      const state = makeBrowsingState([], { mode: 'error', errorMessage: 'EACCES' });

      const next = reducer(state, { type: 'retry' });

      expect(next.mode).toBe('loading');
      expect(next.errorMessage).toBeUndefined();
    });
  });

  describe('cancel', () => {
    it('clears filter when in filtering mode', () => {
      const entries = [makeEntry('file.ts')];
      const state = makeBrowsingState(entries, { mode: 'filtering', filterText: 'test' });

      const next = reducer(state, { type: 'cancel' });

      expect(next.mode).toBe('browsing');
      expect(next.filterText).toBe('');
    });

    it('does not change state when in browsing mode (handled in hook layer)', () => {
      const state = makeBrowsingState([makeEntry('file.ts')]);

      const next = reducer(state, { type: 'cancel' });

      expect(next.mode).toBe('browsing');
    });
  });
});
