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

// Strip ANSI colour codes so content checks hold under FORCE_COLOR.
const ansiPattern = new RegExp(String.raw`${String.fromCodePoint(27)}\[[0-9;]*m`, 'g');

function stripAnsi(frame: string | undefined): string {
  return (frame ?? '').replaceAll(ansiPattern, '');
}

/**
 * Poll until `assertion` stops throwing, or fail with its last error after
 * `timeoutMs`. Deterministic replacement for fixed sleeps: passes as soon as
 * the condition holds, only times out when the condition genuinely never does.
 *
 * After the condition holds, flush a few macrotask turns: ink's `useInput`
 * re-attaches its stdin listener in a passive effect after every render, so a
 * keypress written the instant a new frame is visible (commit happens before
 * effects) can be dropped. The flush lets effects settle before the caller's
 * next `stdin.write`.
 */
async function waitFor(assertion: () => void, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  for (;;) {
    try {
      assertion();
      break;
    } catch (error) {
      if (Date.now() - start >= timeoutMs) throw error;
      await new Promise(resolve => {
        setTimeout(resolve, 10);
      });
    }
  }

  await settle();
}

/** Poll until the (ANSI-stripped) frame satisfies `matcher`. */
async function waitForFrame(
  lastFrame: () => string | undefined,
  matcher: (plainFrame: string) => boolean,
  timeoutMs = 2000,
): Promise<void> {
  await waitFor(() => {
    const plain = stripAnsi(lastFrame());
    if (!matcher(plain)) {
      throw new Error(`Frame did not match:\n${plain}`);
    }
  }, timeoutMs);
}

/** Run `action` (e.g. a keypress) and poll until the frame re-renders. */
async function frameChange(lastFrame: () => string | undefined, action: () => void): Promise<void> {
  const before = lastFrame();
  action();
  await waitFor(() => {
    if (lastFrame() === before) {
      throw new Error('Frame did not change');
    }
  });
}

/**
 * Flush a handful of macrotask turns so pending renders, effects, and mocked
 * (immediately-resolving) promises settle. Only used before NEGATIVE
 * assertions, where there is no positive condition to poll for. All async
 * work in these tests is microtask/timer-0 based, so a fixed number of
 * event-loop turns is deterministic regardless of machine load.
 */
async function settle(turns = 10): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }
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

      await waitForFrame(lastFrame, frame =>
        frame.includes('src') && frame.includes('package.json') && frame.includes('README.md'));
    });

    it('shows directories before files', async () => {
      const { lastFrame } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('package.json'));

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

      // First directory alphabetically is node_modules
      await waitForFrame(lastFrame, frame => frame.includes('>'));
    });

    it('hides hidden files by default', async () => {
      const { lastFrame } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('src'));
      expect(lastFrame()).not.toContain('.gitignore');
    });

    it('shows hidden files when showHidden is true', async () => {
      const { lastFrame } = render(
        <FilePicker initialPath="/mock" showHidden />
      );

      await waitForFrame(lastFrame, frame => frame.includes('.gitignore'));
    });

    it('shows empty directory message when no entries', async () => {
      mockReadDirectory.mockResolvedValue([]);

      const { lastFrame } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('Empty directory'));
    });

    it('shows error message on read failure', async () => {
      mockReadDirectory.mockRejectedValue(new Error('EACCES: permission denied'));

      const { lastFrame } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('Error') && frame.includes('EACCES'));
    });
  });

  describe('navigation', () => {
    it('moves focus down with arrow down', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      // Arrow down moves focus to the second entry (frame re-renders)
      await frameChange(lastFrame, () => stdin.write('\x1B[B'));

      expect(lastFrame()).toBeDefined();
    });

    it('moves focus up with arrow up', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      // Go down then up
      await frameChange(lastFrame, () => stdin.write('\x1B[B'));
      await frameChange(lastFrame, () => stdin.write('\x1B[A'));

      expect(lastFrame()).toBeDefined();
    });

    it('jumps to the last entry with End and back to the first with Home', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      // Entries can render in a single row, so assert the focus marker `>`
      // sits immediately before the focused entry, not merely on the frame.

      // End (CSI F) — focus jumps to the last visible entry (README.md:
      // directories sort first, .gitignore is hidden by default)
      stdin.write('\x1B[F');
      await waitForFrame(lastFrame, frame => />\s*README\.md/.test(frame));

      // Home (CSI H) — focus returns to the first entry
      stdin.write('\x1B[H');
      await waitForFrame(lastFrame, frame => />\s*›\s*node_modules/.test(frame));
      expect(stripAnsi(lastFrame())).not.toMatch(/>\s*README\.md/);
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

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      // First focused entry should be 'node_modules' (alphabetically first dir)
      // Press Enter to navigate in
      stdin.write('\r');

      // Should call readDirectory again
      await waitFor(() => expect(mockReadDirectory).toHaveBeenCalledTimes(2));
    });

    it('goes to parent on Backspace', async () => {
      const parentEntries = [makeEntry('mock', 'directory')];
      mockReadDirectory
        .mockResolvedValueOnce(defaultEntries)
        .mockResolvedValueOnce(parentEntries);

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      // Backspace to go to parent
      stdin.write('\x7F');

      await waitFor(() => expect(mockReadDirectory).toHaveBeenCalledTimes(2));
    });
  });

  describe('selection - single mode', () => {
    it('calls onSelect with file path on Enter', async () => {
      const onSelect = vi.fn();
      const entries = [makeEntry('file.ts')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" onSelect={onSelect} />
      );

      await waitForFrame(lastFrame, frame => frame.includes('file.ts'));

      // Enter on the file
      stdin.write('\r');

      await waitFor(() => expect(onSelect).toHaveBeenCalledWith(['/mock/file.ts']));
    });

    it('does not call onSelect when Enter on directory (navigates instead)', async () => {
      const onSelect = vi.fn();
      mockReadDirectory.mockResolvedValue(defaultEntries);

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" onSelect={onSelect} />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      // First entry is a directory; Enter navigates (second readDirectory call)
      stdin.write('\r');
      await waitFor(() => expect(mockReadDirectory).toHaveBeenCalledTimes(2));

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

      await waitForFrame(lastFrame, frame => frame.includes('file1.ts'));

      // Space to toggle selection
      stdin.write(' ');

      await waitForFrame(lastFrame, frame => frame.includes('[x]'));
    });

    it('calls onSelect with all selected paths on Enter', async () => {
      const onSelect = vi.fn();
      const entries = [makeEntry('file1.ts'), makeEntry('file2.ts')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" multiSelect onSelect={onSelect} />
      );

      await waitForFrame(lastFrame, frame => frame.includes('file1.ts'));

      // Select first, move down, select second, then Enter. Wait for each
      // keypress to render before the next: the input handler reads focus and
      // selection state from its render closure.
      stdin.write(' ');
      await waitForFrame(lastFrame, frame => frame.includes('[x]'));
      await frameChange(lastFrame, () => stdin.write('\x1B[B'));
      stdin.write(' ');
      await waitForFrame(lastFrame, frame => (frame.match(/\[x]/g) ?? []).length === 2);
      stdin.write('\r');

      await waitFor(() =>
        expect(onSelect).toHaveBeenCalledWith(['/mock/file1.ts', '/mock/file2.ts']));
    });
  });

  describe('filtering', () => {
    it('enters filter mode on / key', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      stdin.write('/');

      await waitForFrame(lastFrame, frame => frame.includes('/') && frame.includes('clear filter'));
    });

    it('filters entries by typed text', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      // Type 'pack' to filter, waiting for each char to render (the handler
      // reads filter mode from its render closure)
      await frameChange(lastFrame, () => stdin.write('p'));
      await frameChange(lastFrame, () => stdin.write('a'));
      await frameChange(lastFrame, () => stdin.write('c'));
      await frameChange(lastFrame, () => stdin.write('k'));

      await waitForFrame(lastFrame, frame =>
        frame.includes('package.json') && !frame.includes('README.md'));
    });

    it('clears filter on Escape', async () => {
      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      // Enter filter mode and type a non-matching char
      stdin.write('/');
      await waitForFrame(lastFrame, frame => frame.includes('clear filter'));
      await frameChange(lastFrame, () => stdin.write('x'));

      // Escape clears filter; back to browsing with all entries visible
      stdin.write('\x1B');
      await waitForFrame(lastFrame, frame =>
        frame.includes('src') && !frame.includes('clear filter'));
    });

    it('shows "No matches" when filter has no results', async () => {
      const entries = [makeEntry('file.ts')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('file.ts'));

      // Type something that doesn't match
      stdin.write('z');

      await waitForFrame(lastFrame, frame => frame.includes('No matches'));
    });
  });

  describe('cancel', () => {
    it('calls onCancel on Escape in browse mode', async () => {
      const onCancel = vi.fn();

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" onCancel={onCancel} />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      stdin.write('\x1B');

      await waitFor(() => expect(onCancel).toHaveBeenCalled());
    });

    it('clears filter (not cancel) on Escape in filter mode', async () => {
      const onCancel = vi.fn();

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" onCancel={onCancel} />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      // Enter filter mode (wait for the mode change to render: the Escape
      // handler branches on mode from its render closure)
      stdin.write('/');
      await waitForFrame(lastFrame, frame => frame.includes('clear filter'));

      // Escape should clear filter, not cancel
      stdin.write('\x1B');
      await waitForFrame(lastFrame, frame => !frame.includes('clear filter'));

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('rootPath sandbox', () => {
    it('does not navigate above rootPath on Backspace', async () => {
      mockReadDirectory.mockResolvedValue(defaultEntries);

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" rootPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));
      expect(mockReadDirectory).toHaveBeenCalledTimes(1);

      // Backspace at the root boundary is a no-op: no re-read.
      stdin.write('\x7F');
      await settle();

      expect(mockReadDirectory).toHaveBeenCalledTimes(1);
    });

    it('still allows navigating up while below rootPath', async () => {
      const childEntries = [makeEntry('index.ts')];
      mockReadDirectory
        .mockResolvedValueOnce(defaultEntries)   // /mock
        .mockResolvedValueOnce(childEntries)     // /mock/src
        .mockResolvedValueOnce(defaultEntries);  // back to /mock

      const { lastFrame, stdin } = render(
        <FilePicker initialPath="/mock" rootPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      // Enter first directory (node_modules, alphabetically first)
      stdin.write('\r');
      await waitFor(() => expect(mockReadDirectory).toHaveBeenCalledTimes(2));
      await waitForFrame(lastFrame, frame => frame.includes('index.ts'));

      // Backspace: allowed, we are below root
      stdin.write('\x7F');
      await waitFor(() => expect(mockReadDirectory).toHaveBeenCalledTimes(3));
      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));

      // Backspace again: now at root, no-op
      stdin.write('\x7F');
      await settle();
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

      await waitForFrame(lastFrame, frame =>
        frame.includes('alpha.ts') && !frame.includes('bravo.md'));

      rerender(<FilePicker initialPath="/mock" filter="*.md" />);

      await waitForFrame(lastFrame, frame =>
        frame.includes('bravo.md') && !frame.includes('alpha.ts'));
    });

    it('re-filters hidden files when showHidden changes at runtime', async () => {
      mockReadDirectory.mockResolvedValue(defaultEntries);

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame =>
        frame.includes('src') && !frame.includes('.gitignore'));

      rerender(<FilePicker initialPath="/mock" showHidden />);

      await waitForFrame(lastFrame, frame => frame.includes('.gitignore'));
    });

    it('makes Space toggle selection when multiSelect is enabled at runtime', async () => {
      const entries = [makeEntry('file1.ts'), makeEntry('file2.ts')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, stdin, rerender } = render(
        <FilePicker initialPath="/mock" />
      );

      // multiSelect off: no checkboxes rendered
      await waitForFrame(lastFrame, frame =>
        frame.includes('file1.ts') && !frame.includes('[ ]'));

      rerender(<FilePicker initialPath="/mock" multiSelect />);

      // checkboxes now render (render path picks up the change)
      await waitForFrame(lastFrame, frame => frame.includes('[ ]'));

      // Space now toggles selection (keyboard path reads the same reactive value)
      stdin.write(' ');
      await waitForFrame(lastFrame, frame => frame.includes('[x]'));
    });
  });

  describe('reactive props (more)', () => {
    it('applies maxHeight changes at runtime', async () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        makeEntry(`file-${String(i).padStart(2, '0')}.ts`)
      );
      mockReadDirectory.mockResolvedValue(entries);

      // The "N more below" indicator reflects the window size directly and is
      // robust to the row layout truncating entry names. Strip ANSI colours and
      // all whitespace so the check works under FORCE_COLOR (the indicator may
      // wrap across lines, each re-wrapped in escape codes).
      const compact = (frame: string): string => frame.replaceAll(/\s+/g, '');

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" maxHeight={5} />
      );

      // 20 - 5 visible
      await waitForFrame(lastFrame, frame => compact(frame).includes('15morebelow'));

      rerender(<FilePicker initialPath="/mock" maxHeight={12} />);

      // 20 - 12 visible
      await waitForFrame(lastFrame, frame => compact(frame).includes('8morebelow'));
    });

    it('applies fileTypes changes at runtime', async () => {
      const entries = [makeEntry('file.ts'), makeEntry('dir', 'directory')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('file.ts'));

      rerender(<FilePicker initialPath="/mock" fileTypes="directories" />);

      await waitForFrame(lastFrame, frame =>
        frame.includes('dir') && !frame.includes('file.ts'));
    });

    it('does not loop when given a fresh inline filter each render', async () => {
      const entries = [makeEntry('alpha.ts'), makeEntry('bravo.ts')];
      mockReadDirectory.mockResolvedValue(entries);

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" filter={entry => entry.name.endsWith('.ts')} />
      );

      await waitForFrame(lastFrame, frame => frame.includes('alpha.ts'));
      const frame1 = lastFrame();

      // New inline arrow instance each render -- must not thrash / loop.
      rerender(<FilePicker initialPath="/mock" filter={entry => entry.name.endsWith('.ts')} />);
      await settle();

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

      await waitForFrame(lastFrame, frame => frame.includes('src'));

      rerender(<FilePicker initialPath="/other" />);

      await waitForFrame(lastFrame, frame =>
        frame.includes('other.ts') && !frame.includes('src'));
      expect(mockReadDirectory).toHaveBeenCalledWith('/other');
    });

    it('surfaces error mode when a new initialPath fails to read', async () => {
      mockReadDirectory
        .mockResolvedValueOnce(defaultEntries)
        .mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const { lastFrame, rerender } = render(
        <FilePicker initialPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('src'));
      rerender(<FilePicker initialPath="/bad" />);

      await waitForFrame(lastFrame, frame =>
        frame.includes('Error') && frame.includes('EACCES'));
    });

    it('clamps an out-of-root initialPath to rootPath at mount', async () => {
      mockReadDirectory.mockResolvedValue(defaultEntries);

      render(<FilePicker initialPath="/etc/somewhere" rootPath="/mock" />);

      // The very first read is the clamped root, never the out-of-root path.
      await waitFor(() => expect(mockReadDirectory).toHaveBeenCalledWith('/mock'));
      expect(mockReadDirectory).not.toHaveBeenCalledWith('/etc/somewhere');
    });

    it('treats rootPath as mount-only (runtime change is ignored)', async () => {
      mockReadDirectory.mockResolvedValue(defaultEntries);

      const { lastFrame, stdin, rerender } = render(
        <FilePicker initialPath="/mock" rootPath="/mock" />
      );

      await waitForFrame(lastFrame, frame => frame.includes('node_modules'));
      expect(mockReadDirectory).toHaveBeenCalledTimes(1);

      // Loosen the sandbox at runtime; the pinned mount-time root still applies.
      rerender(<FilePicker initialPath="/mock" rootPath="/" />);
      await settle();

      stdin.write('\x7F'); // Backspace at /mock is still a no-op under the pinned root
      await settle();
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

      rerender(<FilePicker initialPath="/other" />);
      await waitForFrame(lastFrame, frame => frame.includes('new-file.ts'));

      // The superseded /mock read now resolves -- its entries must be discarded.
      resolveStale([makeEntry('stale-file.ts')]);
      await settle();

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

      await waitForFrame(lastFrame, frame => frame.includes('file-00.ts'));

      const frame = lastFrame();
      // Should only show 5 entries, not all 20
      const fileMatches = frame!.match(/file-\d{2}\.ts/g) ?? [];
      expect(fileMatches.length).toBeLessThanOrEqual(5);
    });
  });
});
