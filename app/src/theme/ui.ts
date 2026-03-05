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
  coinflip: '#FFB800',  // gold
  dice:     '#2EE5F6',  // cyan
  mines:    '#FF4757',  // red
  crash:    '#B983FF',  // purple
  plinko:   '#F97316',  // orange
  limbo:    '#EC4899',  // pink
  keno:     '#14B8A6',  // teal
  wheel:    '#FACC15',  // yellow
  blackjack:'#10B981',  // emerald
  roulette: '#EF4444',  // red classic
  hilo:     '#6366F1',  // indigo
  tower:    '#F59E0B',  // amber
  slots:    '#E879F9',  // fuchsia
  dragontower: '#22D3EE', // cyan-400
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
  coinflip: ['rgba(255,184,0,0.10)', 'rgba(255,184,0,0.03)', 'transparent'],
  dice:     ['rgba(46,229,246,0.10)', 'rgba(46,229,246,0.03)', 'transparent'],
  mines:    ['rgba(255,71,87,0.10)', 'rgba(255,71,87,0.03)', 'transparent'],
  crash:    ['rgba(185,131,255,0.10)', 'rgba(185,131,255,0.03)', 'transparent'],

  // Card accent gradients
  cardTaprush:  ['#1A2C38', 'rgba(46,229,246,0.08)'],
  cardCoinflip: ['#1A2C38', 'rgba(255,184,0,0.08)'],
  cardDice:     ['#1A2C38', 'rgba(46,229,246,0.08)'],
  cardMines:    ['#1A2C38', 'rgba(255,71,87,0.08)'],
  cardCrash:    ['#1A2C38', 'rgba(185,131,255,0.08)'],
  cardPlinko:   ['#1A2C38', 'rgba(249,115,22,0.08)'],
  cardLimbo:    ['#1A2C38', 'rgba(236,72,153,0.08)'],
  cardKeno:     ['#1A2C38', 'rgba(20,184,166,0.08)'],
  cardWheel:    ['#1A2C38', 'rgba(250,204,21,0.08)'],
  cardBlackjack:['#1A2C38', 'rgba(16,185,129,0.08)'],
  cardRoulette: ['#1A2C38', 'rgba(239,68,68,0.08)'],
  cardHilo:     ['#1A2C38', 'rgba(99,102,241,0.08)'],
  cardTower:    ['#1A2C38', 'rgba(245,158,11,0.08)'],
  cardSlots:    ['#1A2C38', 'rgba(232,121,249,0.08)'],
  cardDragontower: ['#1A2C38', 'rgba(34,211,238,0.08)'],

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
