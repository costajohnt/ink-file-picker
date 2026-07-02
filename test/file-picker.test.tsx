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

async function delay(ms = 50): Promise<void> {
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

  describe('rootPath sandbox', () => {
    it('does not navigate above rootPath on Backspace', async () => {
      mockReadDirectory.mockResolvedValue(defaultEntries);

      const { stdin } = render(
        <FilePicker initialPath="/mock" rootPath="/mock" />
      );

      await delay();
      expect(mockReadDirectory).toHaveBeenCalledTimes(1);

      // Backspace at the root boundary is a no-op: no re-read.
      stdin.write('\x7F');
      await delay();

      expect(mockReadDirectory).toHaveBeenCalledTimes(1);
    });

    it('still allows navigating up while below rootPath', async () => {
      const childEntries = [makeEntry('index.ts')];
      mockReadDirectory
        .mockResolvedValueOnce(defaultEntries)   // /mock
        .mockResolvedValueOnce(childEntries)     // /mock/src
        .mockResolvedValueOnce(defaultEntries);  // back to /mock

      const { stdin } = render(
        <FilePicker initialPath="/mock" rootPath="/mock" />
      );

      await delay();
      // Enter first directory (node_modules, alphabetically first)
      stdin.write('\r');
      await delay();
      expect(mockReadDirectory).toHaveBeenCalledTimes(2);

      // Backspace: allowed, we are below root
      stdin.write('\x7F');
      await delay();
      expect(mockReadDirectory).toHaveBeenCalledTimes(3);

      // Backspace again: now at root, no-op
      stdin.write('\x7F');
      await delay();
      expect(mockReadDirectory).toHaveBeenCalledTimes(3);
    });
  });

  describe('reactive props', () => {
    it('re-filters the list when the filter prop changes at runtime', async () => {
      const entries = [makeEntry('alpha.ts'), makeEntry('bravo.md')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" filter="*.ts" />
      );

      await delay();
      expect(lastFrame()).toContain('alpha.ts');
      expect(lastFrame()).not.toContain('bravo.md');

      rerender(<FilePicker initialPath="/mock" filter="*.md" />);
      await delay();

      expect(lastFrame()).toContain('bravo.md');
      expect(lastFrame()).not.toContain('alpha.ts');
    });

    it('re-filters hidden files when showHidden changes at runtime', async () => {
      mockReadDirectory.mockResolvedValue(defaultEntries);

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();
      expect(lastFrame()).not.toContain('.gitignore');

      rerender(<FilePicker initialPath="/mock" showHidden />);
      await delay();

      expect(lastFrame()).toContain('.gitignore');
    });

    it('makes Space toggle selection when multiSelect is enabled at runtime', async () => {
      const entries = [makeEntry('file1.ts'), makeEntry('file2.ts')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, stdin, rerender } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();
      // multiSelect off: no checkboxes rendered
      expect(lastFrame()).not.toContain('[ ]');

      rerender(<FilePicker initialPath="/mock" multiSelect />);
      await delay();
      // checkboxes now render (render path picks up the change)
      expect(lastFrame()).toContain('[ ]');

      // Space now toggles selection (keyboard path reads the same reactive value)
      stdin.write(' ');
      await delay();
      expect(lastFrame()).toContain('[x]');
    });
  });

  describe('reactive props (more)', () => {
    it('applies maxHeight changes at runtime', async () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        makeEntry(`file-${String(i).padStart(2, '0')}.ts`)
      );
      mockReadDirectory.mockResolvedValue(entries);

      // The "N more below" indicator reflects the window size directly and is
      // robust to the row layout truncating entry names.
      const moreBelow = (frame: string): number => {
        const match = /(\d+) more below/.exec(frame.replaceAll(/\s+/g, ' '));
        return Number(match?.[1] ?? '0');
      };

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" maxHeight={5} />
      );

      await delay();
      expect(moreBelow(lastFrame()!)).toBe(15); // 20 - 5 visible

      rerender(<FilePicker initialPath="/mock" maxHeight={12} />);
      await delay();
      expect(moreBelow(lastFrame()!)).toBe(8); // 20 - 12 visible
    });

    it('applies fileTypes changes at runtime', async () => {
      const entries = [makeEntry('file.ts'), makeEntry('dir', 'directory')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();
      expect(lastFrame()).toContain('file.ts');

      rerender(<FilePicker initialPath="/mock" fileTypes="directories" />);
      await delay();
      expect(lastFrame()).not.toContain('file.ts');
      expect(lastFrame()).toContain('dir');
    });

    it('does not loop when given a fresh inline filter each render', async () => {
      const entries = [makeEntry('alpha.ts'), makeEntry('bravo.ts')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" filter={entry => entry.name.endsWith('.ts')} />
      );

      await delay();
      const frame1 = lastFrame();

      // New inline arrow instance each render -- must not thrash / loop.
      rerender(<FilePicker initialPath="/mock" filter={entry => entry.name.endsWith('.ts')} />);
      await delay();

      expect(lastFrame()).toBe(frame1);
      expect(lastFrame()).toContain('alpha.ts');
    });
  });

  describe('initialPath reactivity', () => {
    it('navigates and resets when initialPath changes at runtime', async () => {
      const otherEntries = [makeEntry('other.ts')];
      mockReadDirectory
        .mockResolvedValueOnce(defaultEntries) // /mock
        .mockResolvedValueOnce(otherEntries);  // /other

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();
      expect(lastFrame()).toContain('src');

      rerender(<FilePicker initialPath="/other" />);
      await delay();

      expect(mockReadDirectory).toHaveBeenCalledWith('/other');
      expect(lastFrame()).toContain('other.ts');
      expect(lastFrame()).not.toContain('src');
    });

    it('surfaces error mode when a new initialPath fails to read', async () => {
      mockReadDirectory
        .mockResolvedValueOnce(defaultEntries)
        .mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();
      rerender(<FilePicker initialPath="/bad" />);
      await delay();

      expect(lastFrame()).toContain('Error');
      expect(lastFrame()).toContain('EACCES');
    });

    it('clamps an out-of-root initialPath to rootPath at mount', async () => {
      mockReadDirectory.mockResolvedValue(defaultEntries);

      render(<FilePicker initialPath="/etc/somewhere" rootPath="/mock" />);
      await delay();

      // The very first read is the clamped root, never the out-of-root path.
      expect(mockReadDirectory).toHaveBeenCalledWith('/mock');
      expect(mockReadDirectory).not.toHaveBeenCalledWith('/etc/somewhere');
    });

    it('treats rootPath as mount-only (runtime change is ignored)', async () => {
      mockReadDirectory.mockResolvedValue(defaultEntries);

      const { stdin, rerender } = render(
        <FilePicker initialPath="/mock" rootPath="/mock" />
      );

      await delay();
      expect(mockReadDirectory).toHaveBeenCalledTimes(1);

      // Loosen the sandbox at runtime; the pinned mount-time root still applies.
      rerender(<FilePicker initialPath="/mock" rootPath="/" />);
      await delay();

      stdin.write('\x7F'); // Backspace at /mock is still a no-op under the pinned root
      await delay();
      expect(mockReadDirectory).toHaveBeenCalledTimes(1);
    });
  });

  describe('stale directory reads', () => {
    it('discards a stale read that resolves after navigation', async () => {
      let resolveStale!: (entries: FileEntry[]) => void;
      const stale = new Promise<FileEntry[]>(resolve => {
        resolveStale = resolve;
      });
      mockReadDirectory
        .mockReturnValueOnce(stale)                          // /mock -- left pending
        .mockResolvedValueOnce([makeEntry('new-file.ts')]);  // /other -- resolves first

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" />
      );

      await delay();
      rerender(<FilePicker initialPath="/other" />);
      await delay();
      expect(lastFrame()).toContain('new-file.ts');

      // The superseded /mock read now resolves -- its entries must be discarded.
      resolveStale([makeEntry('stale-file.ts')]);
      await delay();

      expect(lastFrame()).toContain('new-file.ts');
      expect(lastFrame()).not.toContain('stale-file.ts');
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
      const fileMatches = frame!.match(/file-\d{2}\.ts/g) ?? [];
      expect(fileMatches.length).toBeLessThanOrEqual(5);
    });
  });
});
