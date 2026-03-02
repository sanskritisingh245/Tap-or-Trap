export const palette = {
  bg: '#0A0E1A',
  bgAlt: '#111827',
  text: '#E2E8F0',
  muted: '#64748B',
  primary: '#FF2D6F',
  primaryStrong: '#FF1A5C',
  accent: '#06D6A0',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  panel: '#1E293B',
  panelSoft: '#1A2332',
  panelStroke: 'rgba(255, 45, 111, 0.15)',
  buttonText: '#FFFFFF',
};

export const gameColors = {
  taprush: '#FF2D6F',
  coinflip: '#F59E0B',
  dice: '#06D6A0',
  mines: '#EF4444',
  crash: '#A855F7',
};

export const fonts = {
  display: 'Quicksand_700Bold',
  body: 'Quicksand_500Medium',
  mono: 'JetBrainsMono_300Light',
};

/** Global font scale — multiply all fontSize values by this */
export const FONT_SCALE = 1.2;

/** Scale a font size: fs(14) => 14 * FONT_SCALE */
export const fs = (size: number) => Math.round(size * FONT_SCALE);
