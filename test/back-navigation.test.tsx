import {
  chmod,
  mkdtemp,
  mkdir,
  writeFile,
  symlink,
  rm,
  realpath,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stripVTControlCharacters} from 'node:util';
import React from 'react';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest';
import {render} from 'ink-testing-library';
import {FilePicker} from '../src/components/file-picker/file-picker.js';

// Real filesystem: Back must never get stuck after Enter on a path that
// resolves to the current directory.

function plain(frame: string | undefined): string {
  return stripVTControlCharacters(frame ?? '');
}

async function settle(turns = 10): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }
}

async function waitForFrame(
  lastFrame: () => string | undefined,
  isMatch: (frame: string) => boolean,
  timeoutMs = 3000,
): Promise<void> {
  const start = Date.now();
  while (!isMatch(plain(lastFrame()))) {
    if (Date.now() - start >= timeoutMs) {
      throw new Error(`Frame did not match:\n${plain(lastFrame())}`);
    }

    await new Promise(resolve => {
      setTimeout(resolve, 10);
    });
  }

  await settle();
}

describe('back navigation after entering the current directory', () => {
  let temporary: string;

  beforeEach(async () => {
    temporary = await realpath(await mkdtemp(join(tmpdir(), 'ink-file-picker-back-')));
    await writeFile(join(temporary, 'marker.txt'), 'x');
  });

  afterEach(async () => {
    await chmod(join(temporary, 'locked'), 0o755).catch(() => undefined);
    await rm(temporary, {recursive: true, force: true});
  });

  it('Backspace leaves a dir after Enter on a self-symlink', async () => {
    await mkdir(join(temporary, 'a'));
    await symlink('.', join(temporary, 'a', 'self'));

    const {lastFrame, stdin, unmount} = render(<FilePicker initialPath={join(temporary, 'a')} />);
    await waitForFrame(lastFrame, frame => frame.includes('self'));

    stdin.write('\r');
    await settle(30);
    stdin.write('\u{7F}');

    await waitForFrame(lastFrame, frame => frame.includes('marker.txt'));
    expect(plain(lastFrame())).toContain('marker.txt');

    unmount();
  });

  // Root ignores permission bits, so the directory would load fine.
  it.skipIf(process.getuid?.() === 0)('Escape leaves error mode after Enter on the failed dir again', async () => {
    await mkdir(join(temporary, 'locked'));
    await chmod(join(temporary, 'locked'), 0o000);

    const {lastFrame, stdin, unmount} = render(<FilePicker initialPath={temporary} />);
    await waitForFrame(lastFrame, frame => frame.includes('locked'));

    // Directories sort first, so locked is focused.
    stdin.write('\r');
    await waitForFrame(lastFrame, frame => frame.includes('Error:'));
    stdin.write('\r');
    await settle(30);
    stdin.write('\u{1B}');

    await waitForFrame(lastFrame, frame => frame.includes('marker.txt'));
    expect(plain(lastFrame())).toContain('marker.txt');

    unmount();
  });
});
