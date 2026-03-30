# ink-file-picker

[![npm version](https://img.shields.io/npm/v/ink-file-picker.svg)](https://www.npmjs.com/package/ink-file-picker)
[![CI](https://github.com/costajohnt/ink-file-picker/actions/workflows/ci.yml/badge.svg)](https://github.com/costajohnt/ink-file-picker/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/ink-file-picker.svg)](https://github.com/costajohnt/ink-file-picker/blob/master/LICENSE)

A filesystem navigation and file selection component for [Ink](https://github.com/vadimdemedes/ink) -- the React renderer for CLIs.

## Features

- Directory navigation with breadcrumb path display
- File details (file size)
- Single and multi-select modes
- Type filtering (files only, directories only, or all)
- Glob pattern and predicate function filters
- Virtual scrolling for large directories with scroll indicators
- Symlink support with target resolution and correct back-navigation
- Type-ahead filtering to quickly find entries
- Customizable theme (colors, icons, layout)
- Keyboard-driven with intuitive shortcuts

## Install

```
npm install ink-file-picker
```

Peer dependencies: `ink` (>= 5.0.0) and `react` (>= 18.0.0).

## Quick Start

```tsx
import React from 'react';
import { render } from 'ink';
import { FilePicker } from 'ink-file-picker';

function App() {
  return (
    <FilePicker
      initialPath={process.cwd()}
      showDetails
      onSelect={(paths) => {
        console.log('Selected:', paths);
        process.exit(0);
      }}
      onCancel={() => {
        console.log('Cancelled');
        process.exit(1);
      }}
    />
  );
}

render(<App />);
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialPath` | `string` | `process.cwd()` | Starting directory path |
| `filter` | `string \| (entry: FileEntry) => boolean` | `undefined` | Glob pattern or predicate function to filter visible entries. Glob is matched against entry names. Directories are always shown for navigation unless `fileTypes` is `'directories'`. |
| `showHidden` | `boolean` | `false` | Show hidden files (dotfiles) |
| `showDetails` | `boolean` | `false` | Show file size column |
| `multiSelect` | `boolean` | `false` | Enable multi-select mode (Space to toggle, Enter to confirm) |
| `fileTypes` | `'files' \| 'directories' \| 'all'` | `'all'` | Which entry types to show and allow selection of |
| `maxHeight` | `number` | `10` | Maximum number of entries visible at once (virtual scrolling window) |
| `theme` | `Partial<FilePickerTheme>` | `undefined` | Custom theme overrides merged with defaults (see [Theme Customization](#theme-customization)) |
| `onSelect` | `(paths: string[]) => void` | `undefined` | Called when selection is confirmed. Single-select returns a 1-element array. Multi-select returns all selected paths. |
| `onCancel` | `() => void` | `undefined` | Called when the user presses Escape (outside of filter mode) |
| `onDirectoryChange` | `(path: string) => void` | `undefined` | Called whenever the current directory changes |
| `isDisabled` | `boolean` | `false` | When true, all user input is ignored |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Up / Down | Move focus between entries |
| Home | Jump to first entry |
| End | Jump to last entry |
| Enter | Open focused directory, or select focused file |
| Right Arrow | Open focused directory |
| Left Arrow | Navigate to parent directory |
| Backspace | Navigate to parent (or delete filter character when filtering) |
| Space | Toggle selection in multi-select mode |
| Escape | Cancel filtering, or trigger `onCancel` |
| `/` | Activate filter mode |
| Any printable character | Auto-enter filter mode and start typing |
| `r` (in error mode) | Retry reading the current directory |

## Scroll Indicators

When virtual scrolling is active and there are entries above or below the visible window, the component displays indicators like "3 more above" and "12 more below" so users know there is additional content to scroll through.

## Filtering

When you start typing (or press `/`), the component enters filter mode. All entries are filtered in real-time by a case-insensitive substring match against entry names. Press Backspace to remove characters, or Escape to clear the filter and return to browsing mode.

You can also provide a `filter` prop for persistent filtering:

**Glob pattern** -- uses [picomatch](https://github.com/micromatch/picomatch) syntax:

```tsx
<FilePicker filter="*.{ts,tsx}" />
```

**Predicate function** -- full control over which entries appear:

```tsx
<FilePicker filter={(entry) => entry.size > 1024} />
```

In both cases, directories (and symlinks to directories) are always shown so you can still navigate into them.

## Multi-Select Mode

Enable `multiSelect` to let users select multiple files before confirming:

```tsx
<FilePicker
  multiSelect
  onSelect={(paths) => {
    console.log('Selected files:', paths);
  }}
/>
```

- Press **Space** to toggle the focused entry in/out of the selection
- Press **Enter** to confirm and submit all selected paths
- If no entries are toggled, pressing Enter on a file submits just that file
- Selected entries are highlighted in the list

## File Types

The `fileTypes` prop controls which entries can be selected:

- `'all'` (default) -- all entries are visible and selectable
- `'files'` -- only files can be selected; directories are still shown for navigation
- `'directories'` -- only directories are visible and selectable

```tsx
// Only allow selecting directories
<FilePicker fileTypes="directories" onSelect={(dirs) => console.log(dirs)} />
```

Symlinks are handled correctly: a symlink pointing to a directory is treated as a directory, and a symlink pointing to a file is treated as a file.

## Show Details

When `showDetails` is enabled, each file entry displays its size (human-readable) alongside the name:

```tsx
<FilePicker showDetails />
```

## Theme Customization

Pass a `theme` prop to override any part of the default theme. The theme object has two keys: `styles` (functions returning Ink `BoxProps`/`TextProps`) and `config` (icon strings and separators).

```tsx
import type { FilePickerTheme } from 'ink-file-picker';

const customTheme: Partial<FilePickerTheme> = {
  styles: {
    headerPath: () => ({ bold: true, color: 'green' }),
    entryName: ({ isFocused, kind }) => ({
      color: isFocused ? 'yellow' : kind === 'directory' ? 'green' : undefined,
      bold: isFocused,
    }),
  },
  config: {
    directoryIcon: '+',
    fileIcon: '-',
  },
};

<FilePicker theme={customTheme} />
```

You only need to provide the keys you want to override; everything else falls back to the default theme. See the `FilePickerTheme` and `FilePickerThemeStyles` types for the full set of customizable style functions and config values.

### Theme Config

| Key | Type | Description |
|-----|------|-------------|
| `directoryIcon` | `string` | Icon shown before directory names |
| `fileIcon` | `string` | Icon shown before file names |
| `symlinkIcon` | `string` | Icon shown before symlink names |
| `separatorChar` | `string` | Character used for visual separators |
| `directoryTrail` | `string` | Trailing indicator for directories (e.g. `/`) |
| `symlinkIndicator` | `string` | Indicator appended to symlink names |

## Callbacks

### `onSelect(paths: string[])`

Fired when the user confirms their selection. In single-select mode the array has one element. In multi-select mode it contains all toggled paths (or the focused file if none were toggled).

### `onCancel()`

Fired when the user presses Escape while in browsing mode (not filtering). Use this to exit your CLI or return to a parent view.

### `onDirectoryChange(path: string)`

Fired whenever the user navigates to a new directory. Only fires when the path actually changes, not on internal mode transitions. Useful for syncing external state or displaying the current location elsewhere in your UI.

## TypeScript

The package exports all relevant types for consumers:

```ts
import type {
  FileEntry,
  FilePickerProps,
  EntryKind,
  FileTypeFilter,
  EntryFilter,
  OnSelectCallback,
  OnCancelCallback,
  OnDirectoryChangeCallback,
  FilePickerTheme,
  FilePickerThemeStyles,
  FilePickerMode,
  FilePickerStateAPI,
} from 'ink-file-picker';
```

### Key Types

**`FileEntry`** -- represents a single filesystem entry:

```ts
type FileEntry = {
  name: string;           // basename, e.g. "package.json"
  path: string;           // absolute path
  kind: EntryKind;        // 'file' | 'directory' | 'symlink'
  size: number;           // bytes (0 for directories)
  modifiedAt: number;     // ms since epoch
  isHidden: boolean;      // true for dotfiles
  symlinkTarget?: string; // resolved target path (symlinks only)
  symlinkTargetKind?: EntryKind; // kind of the target (symlinks only)
};
```

**`FilePickerStateAPI`** -- returned by the `useFilePickerState` hook for building custom file picker UIs.

### Advanced Hooks

For custom file picker UIs, the package exposes the underlying hooks:

```ts
import {
  useFilePickerState,
  useFilePicker,
  useDirectoryReader,
} from 'ink-file-picker';
```

- `useFilePickerState(props)` -- manages all state and actions (reducer, focus, filtering, navigation)
- `useFilePicker({ state, onSelect, onCancel })` -- wires keyboard input to the state API
- `useDirectoryReader(path, dispatch)` -- reads directory contents and dispatches results

## Known Limitations

- **Home/End key support relies on an Ink internal API.** Ink's public `useInput` hook does not expose Home and End key events. This component subscribes to `internal_eventEmitter` on Ink's stdin to capture the raw escape sequences for those keys. This works with current versions of Ink (v5.x) but could break if Ink changes or removes that internal emitter in a future release. If Home/End stop working after an Ink upgrade, this is the likely cause.

## Contributing

Contributions are welcome. Please open an issue to discuss larger changes before submitting a PR.

```bash
git clone https://github.com/costajohnt/ink-file-picker.git
cd ink-file-picker
npm install
npm run build
npm test
```

## Changelog

This project follows [Semantic Versioning](https://semver.org/). See [GitHub Releases](https://github.com/costajohnt/ink-file-picker/releases) for the changelog.

## License

MIT
