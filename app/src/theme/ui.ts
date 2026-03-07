// Premium design tokens: restrained, high-contrast, dark surfaces.

export const palette = {
  bg: '#0B1220',
  bgAlt: '#111B2E',
  panel: '#162236',
  panelSoft: '#1B2A42',
  panelStroke: 'rgba(151, 171, 205, 0.22)',

  text: '#F5F8FF',
  muted: 'rgba(221, 230, 250, 0.68)',
  tertiary: 'rgba(221, 230, 250, 0.35)',

  primary: '#4F8CFF',
  primaryStrong: '#2E6EF2',
  accent: '#53E2D2',
  success: '#41D28C',
  warning: '#FFC15D',
  danger: '#FF5A7A',
  purple: '#9E7BFF',

  fillPrimary: 'rgba(79,140,255,0.13)',
  fillSecondary: 'rgba(79,140,255,0.08)',
  fillTertiary: 'rgba(79,140,255,0.05)',

  buttonText: '#F7FAFF',
};

export const gameColors = {
  taprush: '#53E2D2',
};

export const fonts = {
  display: 'Inter_700Bold',
  body: 'Inter_500Medium',
  light: 'Inter_400Regular',
  mono: 'JetBrainsMono_500Medium',
};

export const gradients = {
  cool: ['rgba(79,140,255,0.2)', 'rgba(79,140,255,0.05)', 'transparent'],
  warm: ['rgba(255,193,93,0.18)', 'rgba(255,193,93,0.04)', 'transparent'],
  danger: ['rgba(255,90,122,0.2)', 'rgba(255,90,122,0.05)', 'transparent'],

  taprush: ['rgba(83,226,210,0.18)', 'rgba(83,226,210,0.04)', 'transparent'],

  cardTaprush: ['#1B2A42', 'rgba(83,226,210,0.12)'],

  primaryBtn: ['#4F8CFF', '#2E6EF2'],
  successBtn: ['#41D28C', '#21B870'],
  warningBtn: ['#FFC15D', '#E9A93B'],
  dangerBtn: ['#FF5A7A', '#E63F60'],
  accentBtn: ['#53E2D2', '#35C8B8'],
  purpleBtn: ['#9E7BFF', '#855EFF'],

  panelDepth: ['#1B2A42', '#162236', '#0B1220'],
};

export const shadows = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.36,
    shadowRadius: 22,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  }),
};

export const fs = (size: number) => size;
