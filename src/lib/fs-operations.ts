import { readdir, stat, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { FileEntry, EntryKind } from '../types.js';

export type ReadDirectoryOptions = {
  /** Whether to follow symlinks and resolve their targets */
  followSymlinks?: boolean;
};

/**
 * Read a directory and return enriched FileEntry objects.
 * Uses fs.readdir with { withFileTypes: true } for efficiency.
 */
export async function readDirectory(
  dirPath: string,
  options: ReadDirectoryOptions = {},
): Promise<FileEntry[]> {
  const { followSymlinks = true } = options;
  const resolvedPath = resolve(dirPath);

  const dirents = await readdir(resolvedPath, { withFileTypes: true });

  const entries: FileEntry[] = await Promise.all(
    dirents.map(async (dirent): Promise<FileEntry> => {
      const entryPath = join(resolvedPath, dirent.name);
      const isHidden = dirent.name.startsWith('.');

      let kind: EntryKind;
      let size = 0;
      let modifiedAt = 0;
      let symlinkTarget: string | undefined;
      let symlinkTargetKind: EntryKind | undefined;

      if (dirent.isSymbolicLink()) {
        kind = 'symlink';
        if (followSymlinks) {
          try {
            const resolvedTarget = await realpath(entryPath);
            symlinkTarget = resolvedTarget;
            const targetStat = await stat(resolvedTarget);
            symlinkTargetKind = targetStat.isDirectory() ? 'directory' : 'file';
            size = targetStat.size;
            modifiedAt = targetStat.mtimeMs;
          } catch {
            // Broken symlink -- leave target fields undefined
            symlinkTarget = undefined;
            symlinkTargetKind = undefined;
          }
        }
      } else if (dirent.isDirectory()) {
        kind = 'directory';
        try {
          const dirStat = await stat(entryPath);
          modifiedAt = dirStat.mtimeMs;
        } catch {
          // Permission denied -- leave defaults
        }
      } else {
        kind = 'file';
        try {
          const fileStat = await stat(entryPath);
          size = fileStat.size;
          modifiedAt = fileStat.mtimeMs;
        } catch {
          // Permission denied -- leave defaults
        }
      }

      return {
        name: dirent.name,
        path: entryPath,
        kind,
        size,
        modifiedAt,
        isHidden,
        symlinkTarget,
        symlinkTargetKind,
      };
    }),
  );

  return entries;
}
