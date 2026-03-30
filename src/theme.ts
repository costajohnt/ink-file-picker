import type { BoxProps, TextProps } from 'ink';
import figures from 'figures';
import type { FilePickerTheme } from './types.js';

const theme: FilePickerTheme = {
  styles: {
    container: (): BoxProps => ({
      flexDirection: 'column',
    }),
    header: (): BoxProps => ({
      flexDirection: 'row',
    }),
    headerPath: (): TextProps => ({
      bold: true,
      color: 'cyan',
    }),
    filterInput: (): TextProps => ({
      color: 'yellow',
    }),
    separator: (): TextProps => ({
      dimColor: true,
    }),
    entryRow: ({ isFocused }): BoxProps => ({
      flexDirection: 'row',
      gap: 1,
      paddingLeft: isFocused ? 0 : 2,
    }),
    entryIcon: ({ kind }): TextProps => ({
      color: kind === 'directory' ? 'cyan'
           : kind === 'symlink' ? 'magenta'
           : undefined,
    }),
    entryName: ({ isFocused, isSelected, kind }): TextProps => {
      let color: string | undefined;
      if (isSelected) color = 'green';
      if (isFocused) color = kind === 'directory' ? 'cyan' : 'blue';
      return { color, bold: isFocused };
    },
    entryDetails: (): TextProps => ({
      dimColor: true,
    }),
    selectedIndicator: (): TextProps => ({
      color: 'green',
    }),
    focusIndicator: (): TextProps => ({
      color: 'blue',
    }),
    footer: (): BoxProps => ({
      flexDirection: 'row',
      gap: 1,
    }),
    footerKey: (): TextProps => ({
      bold: true,
      dimColor: true,
    }),
    footerDescription: (): TextProps => ({
      dimColor: true,
    }),
    spinner: (): TextProps => ({
      color: 'cyan',
    }),
    error: (): TextProps => ({
      color: 'red',
    }),
    emptyDirectory: (): TextProps => ({
      dimColor: true,
      italic: true,
    }),
  },
  config: {
    directoryIcon: figures.pointerSmall,
    fileIcon: ' ',
    symlinkIcon: figures.arrowRight,
    separatorChar: '\u2500',
    directoryTrail: '/',
    symlinkIndicator: '\u2192',
  },
};

export default theme;
