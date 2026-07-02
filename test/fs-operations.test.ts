import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readDirectory } from '../src/lib/fs-operations.js';
import { resolve, join } from 'node:path';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const FIXTURES_DIR = resolve(import.meta.dirname, 'fixtures/sample-tree');

describe('readDirectory', () => {
  it('reads directory entries with correct names and paths', async () => {
    const entries = await readDirectory(FIXTURES_DIR);

    const names = entries.map(e => e.name).sort();
    expect(names).toContain('src');
    expect(names).toContain('package.json');
    expect(names).toContain('README.md');
  });

  it('identifies files vs directories', async () => {
    const entries = await readDirectory(FIXTURES_DIR);

    const src = entries.find(e => e.name === 'src');
    expect(src?.kind).toBe('directory');

    const pkg = entries.find(e => e.name === 'package.json');
    expect(pkg?.kind).toBe('file');
  });

  it('populates size for files', async () => {
    const entries = await readDirectory(FIXTURES_DIR);

    const pkg = entries.find(e => e.name === 'package.json');
    expect(pkg?.size).toBeGreaterThan(0);
  });

  it('populates modifiedAt for files', async () => {
    const entries = await readDirectory(FIXTURES_DIR);

    const pkg = entries.find(e => e.name === 'package.json');
    expect(pkg?.modifiedAt).toBeGreaterThan(0);
  });

  it('detects hidden files', async () => {
    const entries = await readDirectory(FIXTURES_DIR);

    const hidden = entries.find(e => e.name === '.hidden-file');
    expect(hidden).toBeDefined();
    expect(hidden?.isHidden).toBe(true);

    const pkg = entries.find(e => e.name === 'package.json');
    expect(pkg?.isHidden).toBe(false);
  });

  it('sets correct absolute paths', async () => {
    const entries = await readDirectory(FIXTURES_DIR);

    const pkg = entries.find(e => e.name === 'package.json');
    expect(pkg?.path).toBe(join(FIXTURES_DIR, 'package.json'));
  });

  it('throws on non-existent directory', async () => {
    await expect(
      readDirectory('/this/path/does/not/exist')
    ).rejects.toThrow();
  });
});

describe('readDirectory with many symlinks (bounded concurrency)', () => {
  let tmp: string;
  const linkCount = 25; // > STAT_CONCURRENCY (10) to exercise the bounded worker pool

  beforeAll(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'ink-file-picker-symlinks-'));
    const targetDir = join(tmp, 'target-dir');
    const targetFile = join(tmp, 'target-file.txt');
    await mkdir(targetDir);
    await writeFile(targetFile, 'hello');

    // A mix of symlinks-to-dir, symlinks-to-file, and one broken symlink.
    for (let i = 0; i < linkCount; i++) {
      const dest = i % 2 === 0 ? targetDir : targetFile;
      await symlink(dest, join(tmp, `link-${String(i).padStart(2, '0')}`));
    }
    await symlink(join(tmp, 'nope-does-not-exist'), join(tmp, 'broken-link'));
  });

  afterAll(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('resolves every symlink target without dropping entries', async () => {
    const entries = await readDirectory(tmp);
    const links = entries.filter(e => e.name.startsWith('link-'));
    expect(links.length).toBe(linkCount);

    for (const link of links) {
      expect(link.kind).toBe('symlink');
      expect(link.symlinkTargetKind).toBeDefined();
    }

    const dirLink = entries.find(e => e.name === 'link-00');
    expect(dirLink?.symlinkTargetKind).toBe('directory');
    const fileLink = entries.find(e => e.name === 'link-01');
    expect(fileLink?.symlinkTargetKind).toBe('file');
  });

  it('marks a broken symlink with undefined target fields', async () => {
    const entries = await readDirectory(tmp);
    const broken = entries.find(e => e.name === 'broken-link');
    expect(broken?.kind).toBe('symlink');
    expect(broken?.symlinkTarget).toBeUndefined();
    expect(broken?.symlinkTargetKind).toBeUndefined();
  });
});
