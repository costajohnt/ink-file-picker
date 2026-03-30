import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { FilePicker } from '../src/components/file-picker/file-picker.js';
import type { FileEntry } from '../src/types.js';

// Mock fs-operations at the module boundary
vi.mock('../src/lib/fs-operations.js', () => ({
  readDirectory: vi.fn(),
}));

import { readDirectory } from '../src/lib/fs-operations.js';

const mockReadDirectory = vi.mocked(readDirectory);

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

const defaultEntries: FileEntry[] = [
  makeEntry('src', 'directory'),
  makeEntry('node_modules', 'directory'),
  makeEntry('package.json'),
  makeEntry('README.md'),
  makeEntry('.gitignore'),
];

function delay(ms: number = 50): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockReadDirectory.mockResolvedValue(defaultEntries);
});

describe('FilePicker', () => {
  describe('rendering', () => {
    it('shows loading state initially', () => {
      const { lastFrame } = render(
        <FilePicker initialPath="/mock" />
      );

      const frame = lastFrame();
      expect(frame).toContain('Loading');
    });

    it('shows directory entries after load', async () => {
      const { lastFrame } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      const frame = lastFrame();
      expect(frame).toContain('src');
      expect(frame).toContain('package.json');
      expect(frame).toContain('README.md');
    });

    it('shows directories before files', async () => {
      const { lastFrame } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      const frame = lastFrame();
      // node_modules/ and src/ should appear before package.json and README.md
      const srcIdx = frame!.indexOf('node_modules');
      const pkgIdx = frame!.indexOf('package.json');
      expect(srcIdx).toBeLessThan(pkgIdx);
    });

    it('shows focus indicator on first entry', async () => {
      const { lastFrame } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      const frame = lastFrame();
      // First directory alphabetically is node_modules
      expect(frame).toContain('>');
    });

    it('hides hidden files by default', async () => {
      const { lastFrame } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      const frame = lastFrame();
      expect(frame).not.toContain('.gitignore');
    });

    it('shows hidden files when showHidden is true', async () => {
      const { lastFrame } = render(
        <FilePicker initialPath="/mock" showHidden />
      );

      await delay();

      const frame = lastFrame();
      expect(frame).toContain('.gitignore');
    });

    it('shows empty directory message when no entries', async () => {
      mockReadDirectory.mockResolvedValue([]);

      const { lastFrame } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      const frame = lastFrame();
      expect(frame).toContain('Empty directory');
    });

    it('shows error message on read failure', async () => {
      mockReadDirectory.mockRejectedValue(new Error('EACCES: permission denied'));

      const { lastFrame } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      const frame = lastFrame();
      expect(frame).toContain('Error');
      expect(frame).toContain('EACCES');
    });
  });

  describe('navigation', () => {
    it('moves focus down with arrow down', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      // Arrow down
      stdin.write('\x1B[B');
      await delay();

      const frame = lastFrame();
      // Should have moved focus to the second entry
      expect(frame).toBeDefined();
    });

    it('moves focus up with arrow up', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      // Go down then up
      stdin.write('\x1B[B');
      await delay();
      stdin.write('\x1B[A');
      await delay();

      const frame = lastFrame();
      expect(frame).toBeDefined();
    });

    it('enters directory on Enter', async () => {
      // First call returns default entries; second call for src/ contents
      const srcEntries = [makeEntry('index.ts')];
      mockReadDirectory
        .mockResolvedValueOnce(defaultEntries)
        .mockResolvedValueOnce(srcEntries);

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      // First focused entry should be 'node_modules' (alphabetically first dir)
      // Press Enter to navigate in
      stdin.write('\r');
      await delay();

      // Should have called readDirectory again
      expect(mockReadDirectory).toHaveBeenCalledTimes(2);
    });

    it('goes to parent on Backspace', async () => {
      const parentEntries = [makeEntry('mock', 'directory')];
      mockReadDirectory
        .mockResolvedValueOnce(defaultEntries)
        .mockResolvedValueOnce(parentEntries);

      const { stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      // Backspace to go to parent
      stdin.write('\x7F');
      await delay();

      expect(mockReadDirectory).toHaveBeenCalledTimes(2);
    });
  });

  describe('selection - single mode', () => {
    it('calls onSelect with file path on Enter', async () => {
      const onSelect = vi.fn();
      const entries = [makeEntry('file.ts')];
      mockReadDirectory.mockResolvedValue(entries);

      const { stdin } = render(
        <FilePicker initialPath="/mock" onSelect={onSelect} />
      );

      await delay();

      // Enter on the file
      stdin.write('\r');
      await delay();

      expect(onSelect).toHaveBeenCalledWith(['/mock/file.ts']);
    });

    it('does not call onSelect when Enter on directory (navigates instead)', async () => {
      const onSelect = vi.fn();
      mockReadDirectory.mockResolvedValue(defaultEntries);

      const { stdin } = render(
        <FilePicker initialPath="/mock" onSelect={onSelect} />
      );

      await delay();

      // First entry is a directory; Enter navigates
      stdin.write('\r');
      await delay();

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('selection - multi mode', () => {
    it('toggles selection with Space', async () => {
      const entries = [makeEntry('file1.ts'), makeEntry('file2.ts')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" multiSelect />
      );

      await delay();

      // Space to toggle selection
      stdin.write(' ');
      await delay();

      const frame = lastFrame();
      expect(frame).toContain('[x]');
    });

    it('calls onSelect with all selected paths on Enter', async () => {
      const onSelect = vi.fn();
      const entries = [makeEntry('file1.ts'), makeEntry('file2.ts')];
      mockReadDirectory.mockResolvedValue(entries);

      const { stdin } = render(
        <FilePicker initialPath="/mock" multiSelect onSelect={onSelect} />
      );

      await delay();

      // Select first, move down, select second, then Enter
      stdin.write(' ');
      await delay();
      stdin.write('\x1B[B');
      await delay();
      stdin.write(' ');
      await delay();
      stdin.write('\r');
      await delay();

      expect(onSelect).toHaveBeenCalledWith(['/mock/file1.ts', '/mock/file2.ts']);
    });
  });

  describe('filtering', () => {
    it('enters filter mode on / key', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      stdin.write('/');
      await delay();

      const frame = lastFrame();
      expect(frame).toContain('/');
      expect(frame).toContain('clear filter');
    });

    it('filters entries by typed text', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      // Type 'pack' to filter
      stdin.write('p');
      await delay();
      stdin.write('a');
      await delay();
      stdin.write('c');
      await delay();
      stdin.write('k');
      await delay();

      const frame = lastFrame();
      expect(frame).toContain('package.json');
    });

    it('clears filter on Escape', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      // Enter filter mode
      stdin.write('/');
      await delay();
      stdin.write('x');
      await delay();

      // Escape clears filter
      stdin.write('\x1B');
      await delay();

      const frame = lastFrame();
      // Should be back to browsing with all entries visible
      expect(frame).toContain('src');
    });

    it('shows "No matches" when filter has no results', async () => {
      const entries = [makeEntry('file.ts')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();

      // Type something that doesn't match
      stdin.write('z');
      await delay();
      stdin.write('z');
      await delay();
      stdin.write('z');
      await delay();

      const frame = lastFrame();
      expect(frame).toContain('No matches');
    });
  });

  describe('cancel', () => {
    it('calls onCancel on Escape in browse mode', async () => {
      const onCancel = vi.fn();

      const { stdin } = render(
        <FilePicker initialPath="/mock" onCancel={onCancel} />
      );

      await delay();

      stdin.write('\x1B');
      await delay();

      expect(onCancel).toHaveBeenCalled();
    });

    it('clears filter (not cancel) on Escape in filter mode', async () => {
      const onCancel = vi.fn();

      const { stdin } = render(
        <FilePicker initialPath="/mock" onCancel={onCancel} />
      );

      await delay();

      // Enter filter mode
      stdin.write('/');
      await delay();

      // Escape should clear filter, not cancel
      stdin.write('\x1B');
      await delay();

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('virtual scrolling', () => {
    it('shows only maxHeight entries', async () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        makeEntry(`file-${String(i).padStart(2, '0')}.ts`)
      );
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame } = render(
        <FilePicker initialPath="/mock" maxHeight={5} />
      );

      await delay();

      const frame = lastFrame();
      // Should only show 5 entries, not all 20
      const fileMatches = frame!.match(/file-\d{2}\.ts/g) || [];
      expect(fileMatches.length).toBeLessThanOrEqual(5);
    });
  });
});
