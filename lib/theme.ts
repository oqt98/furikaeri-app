import type { TextStyle, ViewStyle } from 'react-native';

export type ThemeName = 'light' | 'dark' | 'warm';

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
    background: '#f6f1ea',
    backgroundAccent: '#efe6dc',
    surface: '#fffdfa',
    surfaceMuted: '#f4ede5',
    surfaceStrong: '#f0e6db',
    border: '#e5d8c8',
    text: '#2f241c',
    textMuted: '#786a5d',
    textSoft: '#9a8b7b',
    primary: '#8f6f57',
    primaryDark: '#6e5441',
    primarySoft: '#efe1d4',
    accent: '#d7c0ab',
    danger: '#b76c70',
    dangerSoft: '#f7e3e4',
    success: '#6f8f78',
    successSoft: '#e5efe7',
    warning: '#c7935f',
    white: '#ffffff',
    shadow: 'rgba(92, 70, 49, 0.08)',
    overlay: 'rgba(47, 36, 28, 0.26)',
  },
  dark: {
    background: '#17161a',
    backgroundAccent: '#232129',
    surface: '#211f26',
    surfaceMuted: '#2a2731',
    surfaceStrong: '#332f3c',
    border: '#3a3545',
    text: '#f4eee6',
    textMuted: '#c6baad',
    textSoft: '#9f9489',
    primary: '#d29f74',
    primaryDark: '#f0c8a5',
    primarySoft: '#3c3028',
    accent: '#8d6f56',
    danger: '#d98b95',
    dangerSoft: '#4a2b31',
    success: '#98c1a3',
    successSoft: '#27382d',
    warning: '#e0b07f',
    white: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.3)',
    overlay: 'rgba(0, 0, 0, 0.45)',
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
    primaryDark: '#aa6c55',
    primarySoft: '#fde5d8',
    accent: '#efb69f',
    danger: '#c97c86',
    dangerSoft: '#fde3e7',
    success: '#7fa07d',
    successSoft: '#ebf5eb',
    warning: '#d9a162',
    white: '#ffffff',
    shadow: 'rgba(123, 88, 69, 0.1)',
    overlay: 'rgba(67, 48, 39, 0.2)',
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
    shadowOpacity: currentTheme.name === 'dark' ? 0.3 : 0.12,
    shadowRadius: currentTheme.name === 'dark' ? 18 : 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: currentTheme.name === 'dark' ? 3 : 2,
  };
}

export const theme = getTheme('light');
export const cardShadow = createCardShadow(theme);

export const brand = {
  name: 'Daynote',
  subtitle: '1日のふりかえりを、やさしく続ける',
};

export const themeOptions: Array<{
  name: ThemeName;
  label: string;
  description: string;
}> = [
  { name: 'light', label: 'ライト', description: '明るく、素直で見やすい配色です。' },
  { name: 'dark', label: 'ダーク', description: '夜でも目にやさしい落ち着いた配色です。' },
  { name: 'warm', label: 'やさしい', description: 'あたたかく、やわらかい印象の配色です。' },
];
