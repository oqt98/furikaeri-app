import type { TextStyle, ViewStyle } from 'react-native';

export type ThemeName =
  | 'light'
  | 'warm'
  | 'rose'
  | 'amber'
  | 'green'
  | 'mint'
  | 'blue'
  | 'navy';

type ThemePalette = {
  background: string;
  backgroundAccent: string;
  surface: string;
  surfaceMuted: string;
  surfaceStrong: string;
  border: string;
  text: string;
  textMuted: string;
  textSoft: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  white: string;
  shadow: string;
  overlay: string;
};

const palettes: Record<ThemeName, ThemePalette> = {
  light: {
    background: '#f7f3ee',
    backgroundAccent: '#efe7df',
    surface: '#fffdfa',
    surfaceMuted: '#f5eee7',
    surfaceStrong: '#ede3d8',
    border: '#dfd2c3',
    text: '#2f241c',
    textMuted: '#746558',
    textSoft: '#9a8a7a',
    primary: '#8f6f57',
    primaryDark: '#6c513e',
    primarySoft: '#eee0d2',
    accent: '#d9c2ad',
    danger: '#b76c70',
    dangerSoft: '#f8e5e7',
    success: '#678a70',
    successSoft: '#e7efe8',
    warning: '#c8935c',
    white: '#ffffff',
    shadow: 'rgba(79, 56, 37, 0.10)',
    overlay: 'rgba(47, 36, 28, 0.22)',
  },
  warm: {
    background: '#fbf4ee',
    backgroundAccent: '#f7e7db',
    surface: '#fffaf6',
    surfaceMuted: '#fff0e7',
    surfaceStrong: '#f6ddd0',
    border: '#efcfbe',
    text: '#433027',
    textMuted: '#84675a',
    textSoft: '#a78876',
    primary: '#d08d72',
    primaryDark: '#a8644f',
    primarySoft: '#fde5d8',
    accent: '#efb69f',
    danger: '#c97c86',
    dangerSoft: '#fde3e7',
    success: '#7fa07d',
    successSoft: '#ebf5eb',
    warning: '#d9a162',
    white: '#ffffff',
    shadow: 'rgba(123, 88, 69, 0.10)',
    overlay: 'rgba(67, 48, 39, 0.20)',
  },
  rose: {
    background: '#fcf3f4',
    backgroundAccent: '#f8e2e7',
    surface: '#fffafb',
    surfaceMuted: '#fdecef',
    surfaceStrong: '#f5d6dd',
    border: '#ecc2cb',
    text: '#442731',
    textMuted: '#855a68',
    textSoft: '#ad7f8b',
    primary: '#c96f86',
    primaryDark: '#9c5367',
    primarySoft: '#fde1e8',
    accent: '#ebb3c0',
    danger: '#b85363',
    dangerSoft: '#f9dfe5',
    success: '#688973',
    successSoft: '#e8f1ea',
    warning: '#cf9962',
    white: '#ffffff',
    shadow: 'rgba(112, 61, 76, 0.10)',
    overlay: 'rgba(68, 39, 49, 0.18)',
  },
  amber: {
    background: '#fcf7ee',
    backgroundAccent: '#f6ebd5',
    surface: '#fffdf8',
    surfaceMuted: '#fbf1df',
    surfaceStrong: '#f2dfbd',
    border: '#e8d2a7',
    text: '#3f2f18',
    textMuted: '#796148',
    textSoft: '#9a8268',
    primary: '#c88d34',
    primaryDark: '#99681c',
    primarySoft: '#f9e7c0',
    accent: '#e7c06b',
    danger: '#b9675e',
    dangerSoft: '#f8e3df',
    success: '#6c8c5d',
    successSoft: '#e8f0e4',
    warning: '#cb8c2c',
    white: '#ffffff',
    shadow: 'rgba(108, 82, 33, 0.10)',
    overlay: 'rgba(63, 47, 24, 0.18)',
  },
  green: {
    background: '#f2f8f1',
    backgroundAccent: '#e3efe1',
    surface: '#fbfefb',
    surfaceMuted: '#edf5ec',
    surfaceStrong: '#d8e7d6',
    border: '#c4d8c0',
    text: '#243224',
    textMuted: '#5f7460',
    textSoft: '#809381',
    primary: '#5f8a63',
    primaryDark: '#426646',
    primarySoft: '#ddebdc',
    accent: '#a4c5a7',
    danger: '#b3666c',
    dangerSoft: '#f5e1e4',
    success: '#4f8a60',
    successSoft: '#dff0e5',
    warning: '#c2954f',
    white: '#ffffff',
    shadow: 'rgba(48, 74, 50, 0.10)',
    overlay: 'rgba(36, 50, 36, 0.18)',
  },
  mint: {
    background: '#eff8f6',
    backgroundAccent: '#dff0eb',
    surface: '#fbfefd',
    surfaceMuted: '#e9f6f2',
    surfaceStrong: '#d1ebe3',
    border: '#baded3',
    text: '#203430',
    textMuted: '#5a7871',
    textSoft: '#7c9992',
    primary: '#4f9485',
    primaryDark: '#366d61',
    primarySoft: '#d8efe9',
    accent: '#9bcfc1',
    danger: '#b56a72',
    dangerSoft: '#f6e2e5',
    success: '#4f8c72',
    successSoft: '#dff1e9',
    warning: '#c1995f',
    white: '#ffffff',
    shadow: 'rgba(39, 76, 68, 0.10)',
    overlay: 'rgba(32, 52, 48, 0.18)',
  },
  blue: {
    background: '#f1f6fc',
    backgroundAccent: '#e0ebf8',
    surface: '#fbfdff',
    surfaceMuted: '#edf3fb',
    surfaceStrong: '#d8e6f6',
    border: '#c3d6ec',
    text: '#223247',
    textMuted: '#5b708a',
    textSoft: '#7d92aa',
    primary: '#5e86c5',
    primaryDark: '#3d63a0',
    primarySoft: '#dce7f9',
    accent: '#a9c0e8',
    danger: '#b86a71',
    dangerSoft: '#f5e1e4',
    success: '#5d8d73',
    successSoft: '#e4f0e8',
    warning: '#c99b56',
    white: '#ffffff',
    shadow: 'rgba(45, 70, 109, 0.10)',
    overlay: 'rgba(34, 50, 71, 0.18)',
  },
  navy: {
    background: '#171a22',
    backgroundAccent: '#232836',
    surface: '#1f2430',
    surfaceMuted: '#2a3040',
    surfaceStrong: '#343d50',
    border: '#414a61',
    text: '#eef2f8',
    textMuted: '#c2cada',
    textSoft: '#97a3ba',
    primary: '#84a7e6',
    primaryDark: '#b8cef4',
    primarySoft: '#2f3d5d',
    accent: '#6d88b7',
    danger: '#e29aa3',
    dangerSoft: '#4d2e36',
    success: '#9cc8aa',
    successSoft: '#294035',
    warning: '#e2bc80',
    white: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.28)',
    overlay: 'rgba(0, 0, 0, 0.42)',
  },
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

const typography = {
  hero: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  } satisfies TextStyle,
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  } satisfies TextStyle,
  section: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  } satisfies TextStyle,
};

export type AppTheme = {
  name: ThemeName;
  colors: ThemePalette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

export function getTheme(name: ThemeName): AppTheme {
  return {
    name,
    colors: palettes[name],
    spacing,
    radius,
    typography,
  };
}

export function createCardShadow(currentTheme: AppTheme): ViewStyle {
  return {
    shadowColor: currentTheme.colors.shadow,
    shadowOpacity: currentTheme.name === 'navy' ? 0.28 : 0.12,
    shadowRadius: currentTheme.name === 'navy' ? 18 : 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: currentTheme.name === 'navy' ? 3 : 2,
  };
}

export const theme = getTheme('light');
export const cardShadow = createCardShadow(theme);

export const brand = {
  name: 'Daynote',
  subtitle: '1日のふりかえりを、やさしく続ける。',
};

export const themeOptions: Array<{
  name: ThemeName;
  label: string;
  description: string;
}> = [
  { name: 'light', label: 'ライト', description: 'やわらかい定番配色で、毎日使いやすいテーマです。' },
  { name: 'warm', label: 'ウォーム', description: 'あたたかい色味で、やさしい雰囲気に寄せたテーマです。' },
  { name: 'rose', label: 'ローズ', description: '赤みを抑えた落ち着いたピンク系で、読みやすさも保ちます。' },
  { name: 'amber', label: 'アンバー', description: '黄みのある明るさで、軽快に見返しやすいテーマです。' },
  { name: 'green', label: 'グリーン', description: '自然な緑を基調にした、目にやさしいテーマです。' },
  { name: 'mint', label: 'ミント', description: 'すっきりした青緑で、軽さと視認性を両立したテーマです。' },
  { name: 'blue', label: 'ブルー', description: '落ち着いた青系で、情報が見やすく整理されやすいテーマです。' },
  { name: 'navy', label: 'ネイビー', description: '暗めでも文字を読みやすく保った、夜向けのテーマです。' },
];
