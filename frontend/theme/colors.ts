export const defaultSeed = '#6750A4';

export function seedToTonalPalette(seedHex: string) {

  return {
    0: '#000000',
    10: '#21005D',
    20: '#381E72',
    30: '#4F378B',
    40: '#6750A4',
    50: '#7F67BE',
    60: '#9A82DB',
    70: '#B69DF8',
    80: '#D0BCFF',
    90: '#EADDFF',
    95: '#F6EDFF',
    99: '#FFFBFE',
    100: '#FFFFFF',
  };
}

export function getLightScheme(palette: Record<number, string>) {

  return {
    primary: palette[40],
    onPrimary: palette[100],
    primaryContainer: palette[90],
    onPrimaryContainer: palette[10],
  };
}

export function getDarkScheme(palette: Record<number, string>) {

  return {
    primary: palette[80],
    onPrimary: palette[20],
    primaryContainer: palette[30],
    onPrimaryContainer: palette[90],
  };
}