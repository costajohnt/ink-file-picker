import { describe, it, expect } from 'vitest';
import { readDirectory } from '../src/lib/fs-operations.js';
import { resolve, join } from 'node:path';

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
