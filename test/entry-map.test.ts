import { describe, it, expect } from 'vitest';
import { EntryMap } from '../src/lib/entry-map.js';
import type { FileEntry } from '../src/types.js';

function makeEntry(name: string, kind: 'file' | 'directory' = 'file'): FileEntry {
  return {
    name,
    path: `/mock/${name}`,
    kind,
    size: 0,
    modifiedAt: 0,
    isHidden: false,
  };
}

describe('EntryMap', () => {
  it('builds doubly-linked list from entries', () => {
    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];
    const map = new EntryMap(entries);

    expect(map.size).toBe(3);
    expect(map.get('a')?.next?.name).toBe('b');
    expect(map.get('b')?.next?.name).toBe('c');
    expect(map.get('c')?.next).toBeUndefined();

    expect(map.get('c')?.previous?.name).toBe('b');
    expect(map.get('b')?.previous?.name).toBe('a');
    expect(map.get('a')?.previous).toBeUndefined();
  });

  it('first points to first entry', () => {
    const entries = [makeEntry('x'), makeEntry('y')];
    const map = new EntryMap(entries);
    expect(map.first?.name).toBe('x');
  });

  it('last points to last entry', () => {
    const entries = [makeEntry('x'), makeEntry('y')];
    const map = new EntryMap(entries);
    expect(map.last?.name).toBe('y');
  });

  it('each item has correct index', () => {
    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];
    const map = new EntryMap(entries);

    expect(map.get('a')?.index).toBe(0);
    expect(map.get('b')?.index).toBe(1);
    expect(map.get('c')?.index).toBe(2);
  });

  it('handles empty array', () => {
    const map = new EntryMap([]);
    expect(map.size).toBe(0);
    expect(map.first).toBeUndefined();
    expect(map.last).toBeUndefined();
  });

  it('handles single entry', () => {
    const entries = [makeEntry('only')];
    const map = new EntryMap(entries);

    expect(map.size).toBe(1);
    expect(map.first?.name).toBe('only');
    expect(map.last?.name).toBe('only');
    expect(map.first?.next).toBeUndefined();
    expect(map.first?.previous).toBeUndefined();
  });

  it('get() retrieves by name', () => {
    const entries = [makeEntry('target', 'directory')];
    const map = new EntryMap(entries);

    const item = map.get('target');
    expect(item).toBeDefined();
    expect(item?.kind).toBe('directory');
    expect(item?.path).toBe('/mock/target');
  });

  it('preserves entry properties', () => {
    const entry: FileEntry = {
      name: 'test.ts',
      path: '/mock/test.ts',
      kind: 'file',
      size: 1234,
      modifiedAt: 999,
      isHidden: false,
      symlinkTarget: undefined,
    };
    const map = new EntryMap([entry]);
    const item = map.get('test.ts');

    expect(item?.size).toBe(1234);
    expect(item?.modifiedAt).toBe(999);
  });
});
