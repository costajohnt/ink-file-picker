# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

## [0.3.2](https://github.com/costajohnt/ink-file-picker/compare/v0.3.1...v0.3.2) (2026-07-24)


### Bug Fixes

* replace fixed test delays with deterministic frame polling ([fa2c3a5](https://github.com/costajohnt/ink-file-picker/commit/fa2c3a577aa37b31852d3896a233fdc09da8d14e)), closes [#8](https://github.com/costajohnt/ink-file-picker/issues/8)

## [0.3.1](https://github.com/costajohnt/ink-file-picker/compare/v0.3.0...v0.3.1) (2026-07-02)


### Bug Fixes

* use public key.home/key.end for Home/End key handling ([bfb9b04](https://github.com/costajohnt/ink-file-picker/commit/bfb9b041d9f22f9b4c93c8ac11545bd44c829827))

## [0.3.0] - 2026-07-01

### Added

- `rootPath` prop (read at mount) to sandbox navigation to a directory subtree:
  parent navigation is a no-op at the root boundary, symlinks whose targets
  escape the root are not followed, and an out-of-root `initialPath` is clamped
  back to the root
- Config props (`filter`, `showHidden`, `fileTypes`, `multiSelect`,
  `showDetails`, `maxHeight`, `initialPath`) are now reactive: changing them
  after mount updates the picker instead of being silently ignored
- `"./package.json"` to the package `exports` map
- `xo` lint step with `lint` / `lint:fix` scripts and a CI lint job

### Fixed

- Runtime prop changes were frozen at mount; `multiSelect`/`showDetails` could
  render from live props while the keyboard path read stale reducer state
- Reacting to a config change keeps the focused entry on-screen instead of
  stranding it outside the scroll window, and drops selections that the change
  removes from the list
- `truncatePath` now splits on the platform path separator, so display
  truncation is correct on Windows
- Symlink target resolution (`realpath` + `stat`) is now concurrency-bounded so
  directories full of symlinks on slow mounts do not stall unboundedly

### Changed

- Peer dependencies documented correctly as `ink >= 6`, `react >= 19`,
  Node.js `>= 20`

## [0.1.0] - 2026-03-30

### Added

- `FilePicker` component with directory navigation and breadcrumb path display
- Single and multi-select modes
- File type filtering (files only, directories only, or all)
- Glob pattern and predicate function filters via `filter` prop
- Virtual scrolling with scroll indicators for large directories
- Symlink support with target resolution and correct back-navigation
- Type-ahead filtering to quickly find entries
- Customizable theme (colors, icons, layout) via `theme` prop
- File size details column via `showDetails` prop
- Hidden file toggle via `showHidden` prop
- Keyboard-driven navigation (arrows, Home/End, Enter, Escape, Backspace)
- Exported hooks (`useFilePickerState`, `useFilePicker`, `useDirectoryReader`) for custom UIs
- Full TypeScript type exports

[0.3.0]: https://github.com/costajohnt/ink-file-picker/releases/tag/v0.3.0
[0.1.0]: https://github.com/costajohnt/ink-file-picker/releases/tag/v0.1.0
