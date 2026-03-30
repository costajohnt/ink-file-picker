# Contributing to ink-file-picker

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/costajohnt/ink-file-picker.git
cd ink-file-picker
npm install
```

## Building

```bash
npm run build        # one-time build
npm run dev          # watch mode (rebuilds on changes)
```

## Running Tests

```bash
npm test             # single run
npm run test:watch   # watch mode
npm run typecheck    # TypeScript type checking
```

## Running the Demo

```bash
npx tsx examples/basic.tsx
npx tsx examples/demo-recording.tsx
```

## Project Structure

```
src/
  components/
    file-picker/     # main FilePicker component and hooks
  lib/               # utilities (formatting, path helpers)
  constants.ts       # shared constants
  theme.ts           # default theme definition
  types.ts           # all TypeScript types
examples/            # runnable example scripts
test/                # vitest test files
media/               # demo GIF and VHS tape file
```

## Making Changes

1. Fork the repo and create a feature branch from `master`.
2. Make your changes. Add or update tests as needed.
3. Run `npm test` and `npm run typecheck` to make sure everything passes.
4. Open a pull request with a clear description of what changed and why.

## Pull Request Guidelines

- Keep PRs focused on a single change.
- Include tests for new features or bug fixes.
- Follow the existing code style (TypeScript strict mode, functional components).
- Update the README if you're adding or changing public API surface.

## Reporting Issues

Open an issue on GitHub. Include:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Node.js and Ink versions

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
