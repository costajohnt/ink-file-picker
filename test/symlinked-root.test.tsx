import {
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

// Real filesystem (no fs-operations mock): the bug only shows when the
// configured rootPath itself is reached through a symlink, as on macOS where
// /tmp and os.tmpdir() live under a symlinked /var.

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

describe('rootPath reached through a symlink', () => {
  let temporary: string;

  beforeEach(async () => {
    const created = await mkdtemp(join(tmpdir(), 'ink-file-picker-root-'));
    temporary = await realpath(created);
    // real/proj/sub/inside.txt, link -> real, real/proj/sublink -> link/proj/sub
    await mkdir(join(temporary, 'real', 'proj', 'sub'), {recursive: true});
    await writeFile(join(temporary, 'real', 'proj', 'sub', 'inside.txt'), 'x');
    await symlink(join(temporary, 'real'), join(temporary, 'link'));
    await symlink(join(temporary, 'link', 'proj', 'sub'), join(temporary, 'real', 'proj', 'sublink'));
  });

  afterEach(async () => {
    await rm(temporary, {recursive: true, force: true});
  });

  it('follows an in-root symlink when rootPath goes through a symlink', async () => {
    const root = join(temporary, 'link', 'proj');
    const {lastFrame, stdin, unmount} = render(
      <FilePicker initialPath={root} rootPath={root} />,
    );

    await waitForFrame(lastFrame, frame => frame.includes('sublink'));

    // Entries sort as: sub, sublink. Focus sublink and enter it.
    stdin.write('\u{1B}[B');
    await settle();
    stdin.write('\r');

    await waitForFrame(lastFrame, frame => frame.includes('inside.txt'));
    expect(plain(lastFrame())).toContain('inside.txt');

    unmount();
  });

  it('still refuses a symlink that escapes the canonical root', async () => {
    await mkdir(join(temporary, 'outside'));
    await writeFile(join(temporary, 'outside', 'secret.txt'), 'x');
    await symlink(join(temporary, 'outside'), join(temporary, 'real', 'proj', 'escape'));

    const root = join(temporary, 'link', 'proj');
    const {lastFrame, stdin, unmount} = render(
      <FilePicker initialPath={root} rootPath={root} />,
    );

    await waitForFrame(lastFrame, frame => frame.includes('escape'));

    // Entries sort as: escape, sub, sublink. escape is focused first.
    stdin.write('\r');
    await settle(30);

    expect(plain(lastFrame())).not.toContain('secret.txt');
    expect(plain(lastFrame())).toContain('sublink');

    unmount();
  });
});
