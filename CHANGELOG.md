# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).

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

[0.1.0]: https://github.com/costajohnt/ink-file-picker/releases/tag/v0.1.0
