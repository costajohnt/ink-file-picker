import type {FileEntry} from '../types.js';

export type EntryMapItem = FileEntry & {
  index: number;
  previous: EntryMapItem | undefined;
  next: EntryMapItem | undefined;
};

export class EntryMap extends Map<string, EntryMapItem> {
  first: EntryMapItem | undefined;
  last: EntryMapItem | undefined;

  constructor(entries: FileEntry[]) {
    const items: Array<[string, EntryMapItem]> = [];
    let previous: EntryMapItem | undefined;
    let firstItem: EntryMapItem | undefined;

    for (const [index, entry_] of entries.entries()) {
      const entry = entry_!;
      const item: EntryMapItem = {
        ...entry,
        index,
        previous,
        next: undefined,
      };

      if (previous) {
        previous.next = item;
      }

      if (index === 0) {
        firstItem = item;
      }

      previous = item;
      items.push([entry.name, item]);
    }

    super(items);
    this.first = firstItem;
    this.last = previous;
  }
}
