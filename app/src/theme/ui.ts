import { Platform } from 'react-native';

export const palette = {
  bg: '#0B1220',
  bgAlt: '#111B31',
  text: '#F5F8FF',
  muted: '#A6B3CD',
  primary: '#5EC0FF',
  primaryStrong: '#2B8BFF',
  accent: '#6AF5D3',
  success: '#8EF28A',
  warning: '#FFC66B',
  danger: '#FF7D9D',
  panel: 'rgba(21, 33, 56, 0.86)',
  panelSoft: 'rgba(21, 33, 56, 0.66)',
  panelStroke: 'rgba(140, 168, 220, 0.28)',
  buttonText: '#081426',
};

export const fonts = {
  display: Platform.select({ ios: 'AvenirNext-Heavy', android: 'sans-serif-condensed', default: 'System' }),
  body: Platform.select({ ios: 'AvenirNext-DemiBold', android: 'sans-serif-medium', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};
