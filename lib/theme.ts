import { TextStyle, ViewStyle } from 'react-native';

export const theme = {
  colors: {
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
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    pill: 999,
  },
  typography: {
    hero: {
      fontSize: 34,
      lineHeight: 40,
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
  },
};

export const cardShadow: ViewStyle = {
  shadowColor: '#5c4631',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

export const brand = {
  name: 'Daynote',
  subtitle: '30秒で残す、毎日のふりかえり',
};
