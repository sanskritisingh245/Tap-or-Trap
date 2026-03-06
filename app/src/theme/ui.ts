// TapRush Design System v5.0 — Stake-inspired Premium Dark
// Dark charcoal base with clean green/blue accents. Premium casino feel.

export const palette = {
  // Surfaces (charcoal elevation steps like Stake.com)
  bg:        '#0F212E',   // Stake's main background
  bgAlt:     '#172D3E',   // slightly lighter
  panel:     '#1A2C38',   // card/panel surfaces
  panelSoft: '#213743',   // elevated panels
  panelStroke: 'rgba(255,255,255,0.04)',

  // Text
  text:    '#FFFFFF',
  muted:   'rgba(255,255,255,0.50)',
  tertiary: 'rgba(255,255,255,0.25)',

  // Accents — Electric Blue CTA
  primary:       '#3B82F6',  // blue-500
  primaryStrong: '#2563EB',  // blue-600
  accent:        '#60A5FA',  // blue-400
  success:       '#22C55E',  // green-500
  warning:       '#FFB800',  // amber
  danger:        '#FF4757',  // red
  purple:        '#B983FF',

  // Fills
  fillPrimary:   'rgba(59,130,246,0.10)',
  fillSecondary: 'rgba(59,130,246,0.06)',
  fillTertiary:  'rgba(59,130,246,0.03)',

  // Button text (on blue bg)
  buttonText: '#FFFFFF',
};

export const gameColors = {
  taprush:  '#2EE5F6',  // cyan
};

export const fonts = {
  display: 'Inter_700Bold',
  body:    'Inter_500Medium',
  light:   'Inter_400Regular',
  mono:    'JetBrainsMono_500Medium',
};

// Gradient presets
export const gradients = {
  // Ambient screen gradients
  cool:   ['rgba(46,229,246,0.06)', 'rgba(46,229,246,0.02)', 'transparent'],
  warm:   ['rgba(255,184,0,0.06)', 'rgba(255,184,0,0.02)', 'transparent'],
  danger: ['rgba(255,71,87,0.06)', 'rgba(255,71,87,0.02)', 'transparent'],

  // Game header gradients
  taprush:  ['rgba(46,229,246,0.10)', 'rgba(46,229,246,0.03)', 'transparent'],

  // Card accent gradients
  cardTaprush:  ['#1A2C38', 'rgba(46,229,246,0.08)'],

  // Button gradients
  primaryBtn:  ['#3B82F6', '#2563EB'],
  successBtn:  ['#22C55E', '#16A34A'],
  warningBtn:  ['#FFB800', '#E5A500'],
  dangerBtn:   ['#FF4757', '#E5303F'],
  accentBtn:   ['#2EE5F6', '#1BC5D4'],
  purpleBtn:   ['#B983FF', '#9B59FF'],

  // Surface depth
  panelDepth: ['#1A2C38', '#172D3E', '#0F212E'],
};

// Shadow presets (iOS-optimized)
export const shadows = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  }),
};

// No multiplier — sizes are final rendered values
export const fs = (size: number) => size;
