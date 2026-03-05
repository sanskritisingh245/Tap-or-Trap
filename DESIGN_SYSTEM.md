# TapRush Design System v2.0

**Apple Human Interface Guidelines-inspired design system for a premium crypto gaming platform.**

---

> **Design Philosophy**: "Quiet confidence." Every pixel earns its place. The interface disappears — the game stays.
> Inspired by Apple's design language: clarity, deference, depth.

---

**Brand Attributes**
| Attribute | Value |
|---|---|
| Personality | Minimal / Premium |
| Primary Emotion | Trust + Quiet Excitement |
| Target Audience | Design-conscious crypto-native gamers (18–35) |
| Platform | iOS & Android (React Native / Expo) |
| Visual Identity | Matte dark surfaces, frosted glass, luminous accents, zero visual noise |

---

## 1. FOUNDATIONS

### 1.1 Color System

The color philosophy follows Apple's approach: **neutral surfaces, meaningful color.** Color is used *only* to convey meaning — never decoration. The UI is predominantly monochromatic; color appears only for interactive elements, status, and outcomes.

#### Primary Palette

| Name | Hex | RGB | HSL | WCAG on #0A0A0C | Role |
|---|---|---|---|---|---|
| Snow | `#FFFFFF` | 255, 255, 255 | 0°, 0%, 100% | AAA (19.2:1) | Primary text, key data |
| Mint | `#34D399` | 52, 211, 153 | 157°, 65%, 52% | AAA (9.1:1) | Primary action, win state |
| Ice Blue | `#60A5FA` | 96, 165, 250 | 213°, 94%, 68% | AA (6.4:1) | Links, info, secondary interactive |
| Soft Gold | `#FBBF24` | 251, 191, 36 | 43°, 96%, 56% | AAA (10.8:1) | Rewards, credits, premium |
| Rose | `#FB7185` | 251, 113, 133 | 351°, 95%, 71% | AA (7.1:1) | Loss, error, destructive |
| Lavender | `#A78BFA` | 167, 139, 250 | 255°, 92%, 76% | AA (6.0:1) | Special, rare, unique |

#### Semantic Colors

| Semantic | Value | Subtle (10%) | Usage |
|---|---|---|---|
| Success | `#34D399` | `rgba(52,211,153,0.10)` | Win confirmations, positive outcomes |
| Warning | `#FBBF24` | `rgba(251,191,36,0.10)` | Caution, pending states |
| Error | `#FB7185` | `rgba(251,113,133,0.10)` | Losses, validation errors, destructive |
| Info | `#60A5FA` | `rgba(96,165,250,0.10)` | Tips, informational |

#### Surface System (Dark Mode — Primary)

Apple's material system adapted for dark UI. Surfaces are distinguished by subtle luminance steps, not borders.

| Name | Hex | Usage |
|---|---|---|
| Base | `#000000` | True black — app background, maximum contrast |
| Elevated 1 | `#0A0A0C` | Primary surface — screen backgrounds |
| Elevated 2 | `#141416` | Cards, panels, grouped content |
| Elevated 3 | `#1C1C1E` | Raised elements — modals, popovers, active cards |
| Elevated 4 | `#2C2C2E` | Highest elevation — floating sheets, tooltips |
| Separator | `rgba(255,255,255,0.06)` | Subtle dividers between content |
| Separator Opaque | `#1C1C1E` | Dividers on scrollable content |

#### Text Colors

| Name | Value | Contrast on #0A0A0C | Usage |
|---|---|---|---|
| Primary | `#FFFFFF` | 19.2:1 (AAA) | Headlines, critical data, balances |
| Secondary | `rgba(255,255,255,0.60)` | 10.5:1 (AAA) | Body text, descriptions |
| Tertiary | `rgba(255,255,255,0.36)` | 5.8:1 (AA) | Placeholders, timestamps, captions |
| Quaternary | `rgba(255,255,255,0.18)` | 3.2:1 | Disabled text only |

#### Fill Colors (for interactive backgrounds)

| Name | Value | Usage |
|---|---|---|
| Fill Primary | `rgba(255,255,255,0.08)` | Buttons (secondary), input backgrounds |
| Fill Secondary | `rgba(255,255,255,0.05)` | Hover states, subtle highlights |
| Fill Tertiary | `rgba(255,255,255,0.03)` | Barely-there backgrounds, large surfaces |

#### Color Usage Rules — The "Apple Five"

1. **Earn every color.** If removing a color doesn't reduce clarity, remove it. Surfaces are gray. Only interactive elements, status indicators, and outcomes get color.
2. **One accent per context.** Each game screen uses its game color as the sole accent. Never combine two accent colors on one screen.
3. **Subtle > Saturated.** Use 10% opacity tinted backgrounds (`success` at 10%) instead of solid colored backgrounds. Let the text carry the color.
4. **White text, always.** Body text is white at varying opacities — never colored. Only data values (balances, multipliers) may use accent colors.
5. **No neon. No glow.** Replace glow effects with subtle opacity shifts. Luminance, not radiance.

#### Game Identity Colors

| Game | Color | Hex | Personality |
|---|---|---|---|
| TapRush | Mint | `#34D399` | Fast, competitive |
| Coin Flip | Gold | `#FBBF24` | Classic, premium |
| Dice | Ice Blue | `#60A5FA` | Strategic, cool |
| Mines | Rose | `#FB7185` | Tense, high-stakes |
| Crash | Lavender | `#A78BFA` | Dynamic, electric |

---

### 1.2 Typography

#### Font Families

Following Apple's principle: one family, many weights. A single sans-serif with a monospace companion for data.

| Role | Family | Weight | Tracking | Fallback |
|---|---|---|---|---|
| Display | SF Pro Display* | 700 Bold | -0.5px | Inter Bold / System |
| Headline | SF Pro Display* | 600 SemiBold | -0.3px | Inter SemiBold / System |
| Body / UI | SF Pro Text* | 400 Regular | 0px | Inter Regular / System |
| Body Emphasis | SF Pro Text* | 500 Medium | 0px | Inter Medium / System |
| Data / Mono | SF Mono* | 500 Medium | 0px | JetBrains Mono / System Mono |

*\*For cross-platform: use **Inter** (display/body) + **JetBrains Mono** (data). On iOS, SF Pro is native.*

**Recommended React Native mapping:**

| Token | Value |
|---|---|
| `fontDisplay` | `'Inter_700Bold'` |
| `fontHeadline` | `'Inter_600SemiBold'` |
| `fontBody` | `'Inter_400Regular'` |
| `fontBodyMedium` | `'Inter_500Medium'` |
| `fontMono` | `'JetBrainsMono_500Medium'` |

#### Type Scale — iOS Dynamic Type Inspired

No artificial multiplier. Sizes are the actual rendered sizes, optimized for mobile readability.

| Style | Size | Line Height | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| Large Title | 34px | 41px | Bold | -0.5px | Screen titles (Home, Settings) |
| Title 1 | 28px | 34px | Bold | -0.4px | Section headers |
| Title 2 | 22px | 28px | Bold | -0.3px | Card titles, modal headers |
| Title 3 | 20px | 25px | SemiBold | -0.2px | Subsection headers |
| Headline | 17px | 22px | SemiBold | -0.1px | Emphasized body, list headers |
| Body | 17px | 22px | Regular | 0px | Primary readable text |
| Callout | 16px | 21px | Regular | 0px | Secondary body text |
| Subheadline | 15px | 20px | Regular | 0.1px | Tertiary info, metadata |
| Footnote | 13px | 18px | Regular | 0.2px | Timestamps, legal |
| Caption 1 | 12px | 16px | Medium | 0.3px | Labels, badges |
| Caption 2 | 11px | 13px | Regular | 0.4px | Fine print |
| Data Large | 32px | 38px | Mono Medium | -0.5px | Balances, multipliers |
| Data Medium | 20px | 24px | Mono Medium | 0px | Bet amounts, odds |
| Data Small | 14px | 18px | Mono Medium | 0.2px | Inline numbers, stats |

#### Typography Rules

1. **No uppercase body text.** Only Caption 1 may be uppercase, and only for labels/badges. Headlines and titles use title case.
2. **Monospace for money.** All credit amounts, multipliers, wallet addresses, and numerical data use `fontMono`.
3. **Hierarchy through weight, not size.** Prefer changing weight (Regular → SemiBold) over changing size for emphasis within the same text block.
4. **Minimum legibility**: 11px for any rendered text. 15px minimum for any text the user must read to make a decision.

---

### 1.3 Layout Grid

#### Responsive Specifications

| Breakpoint | Width | Columns | Margin | Gutter | Max Content Width |
|---|---|---|---|---|---|
| Compact (Phone) | 375–430px | 4 | 20px | 12px | 100% |
| Regular (Tablet) | 768px+ | 8 | 32px | 16px | 700px |

#### Safe Areas

| Zone | Value |
|---|---|
| Top (notched iOS) | 59px (Dynamic Island), 47px (notch), 20px (legacy) |
| Top (Android) | StatusBar.currentHeight (typically 24px) |
| Bottom (home indicator) | 34px |
| Tab bar total height | 49px + bottom safe area |

#### Layout Principles — Apple's Approach

1. **Full-bleed backgrounds.** Content stretches edge-to-edge. Only text and interactive elements respect margins.
2. **Grouped content.** Related items sit inside `Elevated 2` cards with `borderRadius: 12` — mimicking iOS Settings grouped style.
3. **Consistent leading margin.** All primary text starts at the same horizontal position (20px from edge).

---

### 1.4 Spacing System

Base unit: **4px.** Derived from Apple's 4pt grid.

| Token | Value | Usage |
|---|---|---|
| `xxs` | 2px | Hairline gaps, icon optical adjustments |
| `xs` | 4px | Icon-to-label gap (inline) |
| `sm` | 8px | Tight related content (badge padding, compact lists) |
| `md` | 12px | Default gap between sibling elements |
| `base` | 16px | Standard content padding, list item padding |
| `lg` | 20px | Screen horizontal margins, section padding |
| `xl` | 24px | Between content groups |
| `2xl` | 32px | Major section separation |
| `3xl` | 40px | Screen top padding below navigation |
| `4xl` | 48px | Large breathing room |
| `5xl` | 64px | Empty state centered content offset |

---

### 1.5 Elevation & Depth

Apple uses **material blur** and **subtle shadow** — not borders — to communicate elevation.

| Level | Background | Shadow | Blur | Usage |
|---|---|---|---|---|
| Flat | `#0A0A0C` | None | None | Screen backgrounds |
| Card | `#141416` | `0 1px 3px rgba(0,0,0,0.4)` | None | Content cards, list groups |
| Raised | `#1C1C1E` | `0 2px 8px rgba(0,0,0,0.5)` | None | Active cards, selected items |
| Floating | `#2C2C2E` | `0 8px 32px rgba(0,0,0,0.6)` | Optional backdrop blur (20px) | Modals, sheets, popovers |
| Overlay | `rgba(0,0,0,0.5)` | None | Backdrop blur (30px) | Behind modals/sheets |

**Rule: No borders on cards.** Elevation is communicated through background luminance difference only. The only borders allowed are `Separator` lines between list items.

---

### 1.6 Border Radius

| Token | Value | Usage |
|---|---|---|
| `none` | 0px | Full-bleed elements |
| `sm` | 8px | Small chips, inline badges |
| `md` | 12px | Cards, inputs, buttons |
| `lg` | 16px | Large cards, game cards |
| `xl` | 20px | Modals, bottom sheets |
| `2xl` | 28px | Pill buttons |
| `full` | 9999px | Avatars, circular indicators |

**Rule**: Nested radius = outer radius − padding. A card with `radius: 16` and `padding: 12` should have inner elements at `radius: 8` (not 16).

---

### 1.7 Motion & Animation

Following Apple's spring-based animation philosophy. No linear easing. Everything has mass.

| Token | Config | Usage |
|---|---|---|
| `spring.snappy` | `damping: 20, stiffness: 300` | Button presses, toggles |
| `spring.gentle` | `damping: 15, stiffness: 150` | Page transitions, modals |
| `spring.bouncy` | `damping: 12, stiffness: 200` | Playful elements (coin flip, dice) |
| `duration.instant` | 100ms | Opacity changes, color shifts |
| `duration.fast` | 200ms | Small element transitions |
| `duration.normal` | 350ms | Screen transitions |
| `duration.slow` | 500ms | Game result reveals |

**Rules:**
1. **Every transition uses spring physics** — never linear or cubic-bezier.
2. **Press feedback**: Scale to `0.96` on press, spring back on release. Haptic on press.
3. **No flashy animations.** Results fade in over 500ms with a subtle scale (0.95 → 1.0). No shaking, pulsing, or glowing.
4. **Respect reduced motion.** Check `AccessibilityInfo.isReduceMotionEnabled` and skip decorative animations.

---

## 2. COMPONENTS

### 2.1 Navigation

#### 2.1.1 Tab Bar

Modeled after iOS native tab bar.

**Anatomy**: Container → Tab items (icon + label)

| Part | Specification |
|---|---|
| Container BG | `rgba(20,20,22,0.85)` + `backdropFilter: blur(20px)` |
| Container Height | 49px (+ bottom safe area) |
| Top border | `1px solid rgba(255,255,255,0.06)` — single hairline separator |
| Icon size | 24px (SF Symbols style) |
| Label font | Caption 1 (12px, Medium) |
| Label spacing | 2px below icon |
| Active color | `#FFFFFF` |
| Inactive color | `rgba(255,255,255,0.36)` |
| Tap area | Full tab width × 49px (minimum 44×44) |

**States:**

| State | Icon | Label | Feedback |
|---|---|---|---|
| Inactive | Outline, tertiary | Tertiary text | — |
| Active | Filled, white | White | — |
| Pressed | Filled, white | White | Scale 0.90, spring back |

**Do**: Keep to 5 tabs maximum. Use universally recognizable icons.
**Don't**: Add badges/dots unless absolutely necessary. Never use colored icons for inactive tabs.

**Accessibility**: `accessibilityRole="tab"`, `accessibilityState={{ selected }}`, VoiceOver announces "[Label], tab, [N] of 5"

---

#### 2.1.2 Navigation Bar (Screen Header)

**Anatomy**: Back chevron → Large title (scrollable) or Inline title

| Variant | Title Size | Behavior |
|---|---|---|
| Large Title | 34px, Bold | Collapses to inline on scroll (17px SemiBold, centered) |
| Inline | 17px, SemiBold, centered | Static |

| Part | Specification |
|---|---|
| Height | 44px (navigation bar) + large title area if applicable |
| Back button | SF Symbol `chevron.left` + "Back" label, tint: `Mint` or `Ice Blue` |
| Background | Transparent → `rgba(20,20,22,0.85)` blur on scroll |
| Bottom border | Appears on scroll: `rgba(255,255,255,0.06)` |

---

#### 2.1.3 Segmented Control

Apple's native segmented control pattern.

**Anatomy**: Background track → Sliding selection indicator → Segments

| Part | Specification |
|---|---|
| Track | `rgba(255,255,255,0.05)`, `borderRadius: 8`, `height: 32` |
| Selected indicator | `#2C2C2E`, `borderRadius: 7`, shadow level 1 |
| Label | Subheadline (15px), center-aligned |
| Selected label | White, Medium weight |
| Unselected label | `rgba(255,255,255,0.60)` |
| Animation | Spring (`spring.snappy`) sliding indicator |
| Padding | 2px internal padding around indicator |

---

### 2.2 Buttons

#### 2.2.1 Button Variants

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| **Primary** | `#34D399` | `#000000` | None | One per screen. "Play", "Bet", "Connect Wallet" |
| **Secondary** | `rgba(255,255,255,0.08)` | `#FFFFFF` | None | "Cancel", "Skip", alternative actions |
| **Tertiary** | Transparent | `#34D399` | None | Text-only links, "See all", "Learn more" |
| **Destructive** | `rgba(251,113,133,0.12)` | `#FB7185` | None | "Cash Out", "Disconnect", "Delete" |
| **Outline** | Transparent | `#FFFFFF` | `1px rgba(255,255,255,0.12)` | Low-emphasis actions, "View history" |
| **Pill** | `rgba(255,255,255,0.05)` | Secondary text | None | Quick picks, filters, tags |

#### Sizes

| Size | Height | Padding H | Font | Radius |
|---|---|---|---|---|
| Large | 50px | 24px | Headline (17px SemiBold) | 12px |
| Medium | 44px | 20px | Callout (16px Medium) | 10px |
| Small | 36px | 16px | Subheadline (15px Medium) | 8px |
| Pill | 32px | 14px | Caption 1 (12px Medium) | 16px |

#### States (All Variants)

| State | Visual Change |
|---|---|
| Default | As specified above |
| Pressed | `opacity: 0.7`, `scale: 0.96` (spring.snappy), haptic feedback (light) |
| Disabled | `opacity: 0.3`, no interaction |
| Loading | Text replaced with 16px ActivityIndicator (matching text color), button width maintained |

**Accessibility**: `accessibilityRole="button"`, `accessibilityState={{ disabled, busy }}`. Min touch: 44×44px. Label must describe the action ("Place 10 credit bet", not "Go").

---

### 2.3 Input Components

#### 2.3.1 Text Input (Bet Amount)

Modeled after Apple's clean input fields, with gaming-specific quick actions.

**Anatomy**: Floating label → Input container → Input text + Currency indicator → Quick picks below

| Part | Specification |
|---|---|
| Container | `backgroundColor: rgba(255,255,255,0.05)`, `borderRadius: 12`, `height: 52` |
| Container (focused) | `borderWidth: 1`, `borderColor: gameAccentColor` (subtle ring) |
| Container (error) | `borderWidth: 1`, `borderColor: #FB7185` |
| Input text | Data Large (32px Mono Medium), `color: #FFFFFF`, right-aligned |
| Placeholder | Data Large, `color: rgba(255,255,255,0.18)` |
| Currency label | Caption 1, tertiary text, right side |
| Label above | Caption 1, secondary text, `marginBottom: 6` |
| Balance display | Caption 1, tertiary text, right-aligned above input |

**Quick Picks Row** (below input):

| Part | Specification |
|---|---|
| Layout | Horizontal scroll, `gap: 8` |
| Chip | Pill button variant: `height: 32`, `paddingHorizontal: 14` |
| Chip text | Data Small (14px Mono), secondary text |
| Values | `1`, `5`, `10`, `25`, `½`, `MAX` |
| MAX chip | `backgroundColor: gameAccentColor at 10%`, text in game accent color |

---

#### 2.3.2 Toggle

Apple's native-style toggle.

| Part | Specification |
|---|---|
| Track (off) | `rgba(255,255,255,0.08)`, 51×31px, `radius: 15.5` |
| Track (on) | `#34D399` |
| Thumb | `#FFFFFF`, 27×27px circle, shadow level 1 |
| Animation | Spring (`spring.snappy`) |
| Label | Body (17px), to the left of toggle |

---

#### 2.3.3 Slider (Risk Adjuster)

| Part | Specification |
|---|---|
| Track | `height: 4`, `radius: 2`, `backgroundColor: rgba(255,255,255,0.08)` |
| Fill | `backgroundColor: gameAccentColor` |
| Thumb | 28×28 circle, `#FFFFFF`, shadow level 2 |
| Value label | Data Small, appears above thumb on drag |
| Min/Max labels | Caption 2, tertiary text, at track ends |

---

#### 2.3.4 Checkbox / Radio

| Type | Off | On |
|---|---|---|
| Checkbox | 22×22, `radius: 6`, `border: 1.5px rgba(255,255,255,0.24)` | `bg: #34D399`, white checkmark icon (14px) |
| Radio | 22×22, `radius: 11`, same border | `border: 1.5px #34D399`, inner 10px filled circle |

---

### 2.4 Feedback Components

#### 2.4.1 Alert / Inline Banner

Minimal. No icons unless critical. Color-coded left accent.

| Type | Left Accent | BG | Text Color |
|---|---|---|---|
| Info | `#60A5FA` | `rgba(96,165,250,0.06)` | Secondary |
| Success | `#34D399` | `rgba(52,211,153,0.06)` | Secondary |
| Warning | `#FBBF24` | `rgba(251,191,36,0.06)` | Secondary |
| Error | `#FB7185` | `rgba(251,113,133,0.06)` | Secondary |

| Part | Specification |
|---|---|
| Container | `borderRadius: 12`, `borderLeftWidth: 3`, `padding: 14 16` |
| Title | Headline (17px SemiBold), primary text |
| Body | Callout (16px Regular), secondary text |

---

#### 2.4.2 Toast / Snackbar

| Part | Specification |
|---|---|
| Position | Top, 8px below safe area |
| Container | `bg: Elevated 3`, `radius: 14`, `padding: 14 18`, shadow level 3 |
| Animation | Slide down + fade, spring.gentle |
| Auto-dismiss | 3s (info/success), 5s (error), swipe-up to dismiss |
| Text | Callout (16px), primary text |
| Max width | Screen width − 40px |

---

#### 2.4.3 Bottom Sheet / Modal

Apple's sheet presentation.

**Anatomy**: Dimmed overlay → Sheet → Drag handle → Content

| Part | Specification |
|---|---|
| Overlay | `rgba(0,0,0,0.5)`, tap to dismiss |
| Sheet | `bg: Elevated 3`, `borderTopRadius: 20` |
| Drag handle | 36×5px, `radius: 2.5`, `rgba(255,255,255,0.18)`, centered, `marginTop: 8` |
| Content padding | `20px horizontal`, `16px top` (below handle), `safe area bottom + 20px` |
| Animation | Spring (`spring.gentle`), gesture-driven |
| Detents | `.medium` (50%), `.large` (90%), gesture between |

---

#### 2.4.4 Progress / Loading

**Spinner**: Native `ActivityIndicator`, color matches context (game accent on game screens, white elsewhere).

**Progress Bar**:

| Part | Specification |
|---|---|
| Track | `height: 4`, `radius: 2`, `rgba(255,255,255,0.08)` |
| Fill | Game accent or `#34D399`, animated width |
| Label | Caption 1 above, secondary text: "Level 3 — 240/500 XP" |

**Skeleton Loader**:
- Use `Elevated 2` rectangles matching content dimensions
- Shimmer: Animated gradient sweep (left → right), 1.5s loop
- Corner radius matches final content

---

#### 2.4.5 Empty State

| Part | Specification |
|---|---|
| Container | Centered vertically, `paddingHorizontal: 40` |
| Illustration | SF Symbol at 48px, tertiary color |
| Title | Title 3 (20px SemiBold), primary, `marginTop: 20` |
| Description | Callout (16px), secondary, `textAlign: center`, `marginTop: 8` |
| CTA | Primary button (medium), `marginTop: 24` |

---

### 2.5 Data Display

#### 2.5.1 Game Card

Clean, photographic card with minimal overlay. Let the image speak.

**Anatomy**: Pressable → Image → Bottom-aligned gradient → Title + Meta

| Part | Specification |
|---|---|
| Container | `borderRadius: 16`, `overflow: hidden`, `height: 180` |
| Image | `position: absolute`, fills container, `resizeMode: cover` |
| Gradient | Bottom 50%, `transparent → rgba(0,0,0,0.8)` |
| Title | Title 2 (22px Bold), white, bottom-left |
| Subtitle | Callout (16px), `rgba(255,255,255,0.60)`, below title |
| Badge | Pill, top-right, `margin: 12` — e.g. "LIVE" or "1.96×" |
| Badge bg | `rgba(0,0,0,0.5)` + `blur(10px)` |

**No-image fallback**: Solid `Elevated 2` background, game accent color as a subtle 2px top border. Content centered.

**States:**

| State | Change |
|---|---|
| Default | As specified |
| Pressed | `scale: 0.97`, `opacity: 0.9`, spring back |
| Disabled | `opacity: 0.4` |

---

#### 2.5.2 List / Grouped Table

Apple Settings-style grouped list.

**Anatomy**: Section header → Group container → List items with separators

| Part | Specification |
|---|---|
| Section header | Footnote (13px), secondary text, uppercase, `padding: 8 20`, `letterSpacing: 0.5` |
| Group container | `bg: Elevated 2`, `borderRadius: 12`, `marginHorizontal: 20` |
| List item | `height: 44`, `paddingHorizontal: 16`, flex row |
| Separator | `height: 1`, `bg: Separator`, `marginLeft: 16` (inset) |
| Label | Body (17px), primary text |
| Value / Accessory | Callout (16px), tertiary text, or chevron icon |
| Chevron | SF Symbol `chevron.right`, 14px, tertiary |

---

#### 2.5.3 Leaderboard Row

| Part | Specification |
|---|---|
| Container | `paddingVertical: 12`, `paddingHorizontal: 20` |
| Rank (1–3) | Title 2 (22px Bold), gold/silver/bronze color |
| Rank (4+) | Headline (17px SemiBold), tertiary text, `width: 32` |
| Avatar | 36×36 circle, `bg: Elevated 3`, initial letter (Caption 1) |
| Username | Body (17px), primary text, `flex: 1` |
| Tier badge | Pill with tier color at 10% bg, tier color text |
| Score | Data Medium (20px Mono), primary text, right-aligned |
| Separator | Inset separator between rows |

**Top 3 highlight**: Subtle `fill` background using rank color at 5% opacity.

---

#### 2.5.4 Stats Row

Clean horizontal stat display.

| Part | Specification |
|---|---|
| Layout | `flexDirection: row`, `justifyContent: space-around` |
| Stat label | Caption 1 (12px Medium), tertiary text, center-aligned |
| Stat value | Data Medium (20px Mono), primary text, center-aligned |
| Divider | Optional vertical `Separator` between stats |

---

#### 2.5.5 Tier Badge

Minimal pill badge. No icons — the color communicates the tier.

| Tier | Color | BG (10% opacity) |
|---|---|---|
| Bronze | `#CD7F32` | `rgba(205,127,50,0.10)` |
| Silver | `#A8B0B5` | `rgba(168,176,181,0.10)` |
| Gold | `#FBBF24` | `rgba(251,191,36,0.10)` |
| Diamond | `#60A5FA` | `rgba(96,165,250,0.10)` |
| Phantom | `#A78BFA` | `rgba(167,139,250,0.10)` |

| Size | Height | Font | Padding H | Radius |
|---|---|---|---|---|
| Small | 22px | Caption 1 (12px) | 8px | 6px |
| Large | 28px | Subheadline (15px) | 12px | 8px |

---

#### 2.5.6 Credit Balance

| Part | Specification |
|---|---|
| Value | Data Medium (20px Mono Medium), `#FBBF24` (gold) |
| Label | Caption 1, tertiary, "credits" below or inline |
| Container | `bg: rgba(251,191,36,0.06)`, `radius: 10`, `padding: 6 12` |

---

#### 2.5.7 Match History Item

| Part | Specification |
|---|---|
| Container | `paddingVertical: 12`, separator below |
| Game name | Callout (16px), secondary text |
| Result | Data Small (14px Mono), `#34D399` for "+25" or `#FB7185` for "−10" |
| Timestamp | Caption 2 (11px), tertiary |
| Opponent | Callout, secondary |

---

#### 2.5.8 Live Bet Feed Item

| Part | Specification |
|---|---|
| Layout | Horizontal: avatar → user+game → amount → result |
| Entry animation | Fade in from top, spring.gentle, staggered 50ms |
| Row height | 48px |
| Row bg | Alternating transparent / `Fill Tertiary` |

---

### 2.6 Media & Avatars

#### 2.6.1 Avatar

| Size | Dimensions | Usage |
|---|---|---|
| XS | 24×24 | Inline mentions, dense lists |
| SM | 32×32 | List items, compact UI |
| MD | 40×40 | Standard lists, comments |
| LG | 64×64 | Profile headers |

All: `borderRadius: full`. **Fallback**: `bg: Elevated 3`, initial letter centered, Caption 1 (12px), secondary text.

No borders on avatars. No online indicators unless in a multiplayer lobby.

---

### 2.7 Game-Specific Components

#### 2.7.1 Coin Flip

- Coin: 100×100px, `borderRadius: full`, smooth rotateY animation (spring.bouncy, 800ms)
- Heads: `bg: #FBBF24`, subtle embossed effect
- Tails: `bg: Elevated 3`, subtle debossed effect
- Result: Coin lands, 300ms pause, then outcome text fades in (Title 1)

#### 2.7.2 Dice

- Die: 72×72px, `borderRadius: 12`, `bg: Elevated 3`, `border: 1px Separator`
- Dots: 8px circles, `#FFFFFF`
- Animation: Gentle rotation + settle (spring.bouncy)

#### 2.7.3 Mines Grid

- Grid: 5×5, `gap: 4`
- Unrevealed: `bg: Elevated 2`, `radius: 10`, `border: 1px Separator`
- Revealed safe: `bg: rgba(52,211,153,0.08)`, gem icon (muted, 20px)
- Revealed mine: `bg: rgba(251,113,133,0.08)`, mine icon, subtle shake (2px, 200ms)
- Tap animation: Scale 0.9 → 1.0, spring.snappy

#### 2.7.4 Crash Graph

- Canvas: Full width, `height: 200px`
- Line: `stroke: gameAccentColor`, `strokeWidth: 2`, smooth bezier path
- Background: Subtle gradient fill below line (accent at 5%)
- Multiplier: Data Large (32px Mono), white, centered above graph
- Bust: Multiplier color transitions to `#FB7185`, graph line stops. No flash. Quiet failure.

#### 2.7.5 Ambient Background

Replace the animated gradient orbs with:
- Solid `Base` (#000000) background
- Optional: single very subtle radial gradient (game accent at 3% opacity, centered top) for screen identity
- No animation on the background. Still and quiet.

---

## 3. PATTERNS

### 3.1 Page Templates

#### 3.1.1 Home — Game Hub

```
┌──────────────────────────────┐
│ Dynamic Island / Status Bar  │
├──────────────────────────────┤
│                              │
│ Good evening, Alex      [●]  │  ← Large Title + avatar
│                              │
│ ┌────────────────────────┐   │
│ │  ○ 1,250 credits       │   │  ← Balance card (Elevated 2)
│ │  Gold · 240/500 XP     │   │
│ │  ████████░░░            │   │
│ └────────────────────────┘   │
│                              │
│ Games                        │  ← Section header
│                              │
│ ┌────────────────────────┐   │
│ │                        │   │  ← Featured game card (image)
│ │       TapRush          │   │
│ │    PvP reaction duel   │   │
│ └────────────────────────┘   │
│                              │
│ ┌──────────┐ ┌──────────┐   │  ← 2-column grid
│ │ Coin Flip│ │   Dice   │   │
│ │  50/50   │ │ Custom   │   │
│ └──────────┘ └──────────┘   │
│ ┌──────────┐ ┌──────────┐   │
│ │  Mines   │ │  Crash   │   │
│ │  Board   │ │ Realtime │   │
│ └──────────┘ └──────────┘   │
│                              │
├──────────────────────────────┤
│  Games  Missions Fair Live ⚙ │  ← Tab bar (frosted glass)
└──────────────────────────────┘
```

#### 3.1.2 Game Screen

```
┌──────────────────────────────┐
│ ‹ Back              1,250 ○  │  ← Nav bar + balance
├──────────────────────────────┤
│                              │
│                              │
│        [ GAME VISUAL ]       │  ← Game-specific component
│                              │
│                              │
├──────────────────────────────┤
│                              │
│ Bet amount          420 left │  ← Label + remaining
│ ┌──────────────────────── ┐  │
│ │                     10  │  │  ← Clean input, right-aligned
│ └─────────────────────────┘  │
│  (1)  (5)  (10)  (25)  MAX  │  ← Quick picks (pills)
│                              │
│ ┌─────────────────────────┐  │
│ │        PLAY             │  │  ← Primary button (game accent)
│ └─────────────────────────┘  │
│                              │
│ History ○ ● ○ ○ ● ● ○ ● ○   │  ← Minimal dot history
│                              │
└──────────────────────────────┘
```

#### 3.1.3 Settings

```
┌──────────────────────────────┐
│                              │
│ Settings                     │  ← Large Title
│                              │
│ PREFERENCES                  │  ← Section header (footnote)
│ ┌────────────────────────┐   │
│ │ Sound Effects      [●] │   │  ← Grouped list (Elevated 2)
│ ├────────────────────────┤   │
│ │ Haptic Feedback    [●] │   │
│ ├────────────────────────┤   │
│ │ Animations         [●] │   │
│ └────────────────────────┘   │
│                              │
│ GAME                         │
│ ┌────────────────────────┐   │
│ │ Provably Fair        › │   │
│ ├────────────────────────┤   │
│ │ Match History        › │   │
│ ├────────────────────────┤   │
│ │ Leaderboard          › │   │
│ └────────────────────────┘   │
│                              │
│ ACCOUNT                      │
│ ┌────────────────────────┐   │
│ │ 0x1a2b...3f4e          │   │  ← Wallet address (mono)
│ ├────────────────────────┤   │
│ │ Disconnect Wallet      │   │  ← Destructive text (rose)
│ └────────────────────────┘   │
│                              │
│        TapRush v1.0.0        │  ← Centered footer, tertiary
│                              │
├──────────────────────────────┤
│  Games  Missions Fair Live ⚙ │
└──────────────────────────────┘
```

#### 3.1.4 Leaderboard

```
┌──────────────────────────────┐
│ ‹ Back      Leaderboard      │
├──────────────────────────────┤
│ [ Today | This Week | All ]  │  ← Segmented control
├──────────────────────────────┤
│                              │
│ Your rank                    │
│ #42 of 1,204                 │  ← Data Medium + tertiary
│                              │
├──────────────────────────────┤
│ 1  ○ cryptoKing   Gold  9.2k │
│ 2  ○ degen_alice  Dia.  8.1k │
│ 3  ○ sol_player   Gold  7.3k │
│─────────────────────────────│
│ 4  ○ user_44      Slvr  5.2k │
│ 5  ○ anon_bet     Brnz  4.1k │
│ ...                          │
└──────────────────────────────┘
```

---

### 3.2 User Flows

#### 3.2.1 Onboarding (3 screens max — Apple brevity)

1. **Welcome** — App icon + "TapRush" + one-line tagline. Single "Get Started" primary button.
2. **Connect Wallet** — Clean prompt with Phantom/Solflare options. "Skip for now" tertiary link.
3. **Home** — Land directly on home. No tutorial carousel. Discoverable UI speaks for itself.

#### 3.2.2 Gameplay Flow

1. Tap game card → spring transition to game screen
2. Enter bet (quick pick or manual) — balance updates in real-time
3. Tap "Play" — button enters loading state (spinner, 1–2s)
4. Result animates in (game-specific, 500ms)
5. Outcome displayed: "+25 credits" in success green or "−10 credits" in rose. Quiet. No fireworks.
6. Balance updates with number counting animation (200ms)
7. History dot appends. "Play Again" button appears.

#### 3.2.3 Error Handling

| Scenario | Pattern |
|---|---|
| Network failure | Toast (top): "Connection lost. Retrying..." + auto-retry |
| Insufficient balance | Inline text below input in rose: "Not enough credits" + "Top Up" tertiary link |
| Wallet disconnect | Sheet from bottom: "Wallet disconnected" + "Reconnect" primary button |
| Server error | Toast: "Something went wrong. Try again." — no error codes shown |

#### 3.2.4 Empty States

| Screen | Icon | Title | Body | CTA |
|---|---|---|---|---|
| History | `clock` | No games yet | Play your first game to see results here. | "Browse Games" |
| Leaderboard | `person.3` | No players yet | Be the first to make the board. | — |
| Live Bets | `waveform` | It's quiet here | Bets will appear in real-time. | — |

---

## 4. DESIGN TOKENS

```json
{
  "color": {
    "accent": {
      "mint": { "value": "#34D399" },
      "blue": { "value": "#60A5FA" },
      "gold": { "value": "#FBBF24" },
      "rose": { "value": "#FB7185" },
      "lavender": { "value": "#A78BFA" }
    },
    "surface": {
      "base": { "value": "#000000" },
      "elevated1": { "value": "#0A0A0C" },
      "elevated2": { "value": "#141416" },
      "elevated3": { "value": "#1C1C1E" },
      "elevated4": { "value": "#2C2C2E" }
    },
    "text": {
      "primary": { "value": "#FFFFFF" },
      "secondary": { "value": "rgba(255,255,255,0.60)" },
      "tertiary": { "value": "rgba(255,255,255,0.36)" },
      "quaternary": { "value": "rgba(255,255,255,0.18)" }
    },
    "fill": {
      "primary": { "value": "rgba(255,255,255,0.08)" },
      "secondary": { "value": "rgba(255,255,255,0.05)" },
      "tertiary": { "value": "rgba(255,255,255,0.03)" }
    },
    "separator": {
      "default": { "value": "rgba(255,255,255,0.06)" },
      "opaque": { "value": "#1C1C1E" }
    },
    "semantic": {
      "success": { "value": "#34D399" },
      "warning": { "value": "#FBBF24" },
      "error": { "value": "#FB7185" },
      "info": { "value": "#60A5FA" }
    },
    "game": {
      "taprush": { "value": "#34D399" },
      "coinflip": { "value": "#FBBF24" },
      "dice": { "value": "#60A5FA" },
      "mines": { "value": "#FB7185" },
      "crash": { "value": "#A78BFA" }
    },
    "tier": {
      "bronze": { "value": "#CD7F32" },
      "silver": { "value": "#A8B0B5" },
      "gold": { "value": "#FBBF24" },
      "diamond": { "value": "#60A5FA" },
      "phantom": { "value": "#A78BFA" }
    }
  },
  "font": {
    "family": {
      "display": { "value": "Inter_700Bold" },
      "headline": { "value": "Inter_600SemiBold" },
      "body": { "value": "Inter_400Regular" },
      "bodyMedium": { "value": "Inter_500Medium" },
      "mono": { "value": "JetBrainsMono_500Medium" }
    },
    "size": {
      "largeTitle": { "value": 34 },
      "title1": { "value": 28 },
      "title2": { "value": 22 },
      "title3": { "value": 20 },
      "headline": { "value": 17 },
      "body": { "value": 17 },
      "callout": { "value": 16 },
      "subheadline": { "value": 15 },
      "footnote": { "value": 13 },
      "caption1": { "value": 12 },
      "caption2": { "value": 11 },
      "dataLarge": { "value": 32 },
      "dataMedium": { "value": 20 },
      "dataSmall": { "value": 14 }
    },
    "lineHeight": {
      "largeTitle": { "value": 41 },
      "title1": { "value": 34 },
      "title2": { "value": 28 },
      "title3": { "value": 25 },
      "headline": { "value": 22 },
      "body": { "value": 22 },
      "callout": { "value": 21 },
      "subheadline": { "value": 20 },
      "footnote": { "value": 18 },
      "caption1": { "value": 16 },
      "caption2": { "value": 13 }
    }
  },
  "spacing": {
    "xxs": { "value": 2 },
    "xs": { "value": 4 },
    "sm": { "value": 8 },
    "md": { "value": 12 },
    "base": { "value": 16 },
    "lg": { "value": 20 },
    "xl": { "value": 24 },
    "2xl": { "value": 32 },
    "3xl": { "value": 40 },
    "4xl": { "value": 48 },
    "5xl": { "value": 64 }
  },
  "radius": {
    "none": { "value": 0 },
    "sm": { "value": 8 },
    "md": { "value": 12 },
    "lg": { "value": 16 },
    "xl": { "value": 20 },
    "2xl": { "value": 28 },
    "full": { "value": 9999 }
  },
  "shadow": {
    "card": {
      "offsetX": 0, "offsetY": 1, "blur": 3,
      "color": "rgba(0,0,0,0.4)"
    },
    "raised": {
      "offsetX": 0, "offsetY": 2, "blur": 8,
      "color": "rgba(0,0,0,0.5)"
    },
    "floating": {
      "offsetX": 0, "offsetY": 8, "blur": 32,
      "color": "rgba(0,0,0,0.6)"
    }
  },
  "motion": {
    "spring": {
      "snappy": { "damping": 20, "stiffness": 300 },
      "gentle": { "damping": 15, "stiffness": 150 },
      "bouncy": { "damping": 12, "stiffness": 200 }
    },
    "duration": {
      "instant": { "value": 100 },
      "fast": { "value": 200 },
      "normal": { "value": 350 },
      "slow": { "value": 500 }
    }
  }
}
```

---

## 5. DOCUMENTATION

### 5.1 Design Principles

#### Principle 1: Deference

The interface defers to the content. Surfaces are neutral. Chrome is invisible. The game — not the UI — is the experience. When a coin flips, you watch the coin, not the frame around it.

**Do**: True black backgrounds, transparent navigation bars, minimal borders.
**Don't**: Neon glows, gradient borders, decorative animations, busy backgrounds.

#### Principle 2: Clarity

Every element has one job. Text is readable. Hierarchy is obvious. A player can understand any screen in under 2 seconds: what game, how much, what to do next.

**Do**: Consistent type scale, high contrast ratios (AAA), clear visual hierarchy through weight and opacity.
**Don't**: Multiple accent colors on one screen, uppercase body text, hidden essential information.

#### Principle 3: Precision

A crypto gaming app deals in money. Every number must feel trustworthy. Monospace data fonts, exact alignment, and quiet confidence in how we display balances, odds, and outcomes.

**Do**: JetBrains Mono for all numerical data, right-aligned currency, clean animation of balance changes.
**Don't**: Rounded display fonts for money, approximate numbers ("~250"), delayed balance updates.

---

### 5.2 Do's and Don'ts

| # | Do | Don't |
|---|---|---|
| 1 | Use color only for interactive elements and status | Use color decoratively (neon borders, gradient backgrounds, colored panels) |
| 2 | Distinguish surfaces by luminance (Elevated 1→2→3) | Add borders to cards. If you need a border, your surfaces aren't working |
| 3 | Use spring physics for all animations | Use linear timing or cubic-bezier. Everything has weight |
| 4 | Keep one primary CTA per screen | Put two green buttons on the same screen |
| 5 | Right-align monetary values in monospace | Left-align money or use a display font for numbers |
| 6 | Let images and content fill edge-to-edge | Add margins around hero images or full-bleed content |
| 7 | Use SF Symbols / Ionicons outline style for inactive, filled for active | Use colored icons in navigation. Active = white filled. Inactive = dim outline |
| 8 | Provide haptic feedback on every button press (UIImpactFeedbackGenerator.light) | Skip haptics. Every tap should feel physical |
| 9 | Respect `prefers-reduced-motion` — skip all decorative animation | Assume everyone wants animations. Always provide a code path without them |
| 10 | Group related settings in Apple-style inset grouped lists | Stack settings as a flat list without visual grouping |

---

### 5.3 Implementation Guide

#### Updating `ui.ts`

Replace the current theme file with this token-based system:

```typescript
// theme/ui.ts — TapRush Design System v2.0

export const color = {
  // Surfaces
  base:       '#000000',
  elevated1:  '#0A0A0C',
  elevated2:  '#141416',
  elevated3:  '#1C1C1E',
  elevated4:  '#2C2C2E',

  // Text
  textPrimary:    '#FFFFFF',
  textSecondary:  'rgba(255,255,255,0.60)',
  textTertiary:   'rgba(255,255,255,0.36)',
  textQuaternary: 'rgba(255,255,255,0.18)',

  // Fills
  fillPrimary:   'rgba(255,255,255,0.08)',
  fillSecondary: 'rgba(255,255,255,0.05)',
  fillTertiary:  'rgba(255,255,255,0.03)',

  // Separator
  separator:       'rgba(255,255,255,0.06)',
  separatorOpaque: '#1C1C1E',

  // Accents
  mint:     '#34D399',
  blue:     '#60A5FA',
  gold:     '#FBBF24',
  rose:     '#FB7185',
  lavender: '#A78BFA',
};

export const gameColor = {
  taprush:  color.mint,
  coinflip: color.gold,
  dice:     color.blue,
  mines:    color.rose,
  crash:    color.lavender,
};

export const font = {
  display:    'Inter_700Bold',
  headline:   'Inter_600SemiBold',
  body:       'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  mono:       'JetBrainsMono_500Medium',
};

export const size = {
  largeTitle: 34, title1: 28, title2: 22, title3: 20,
  headline: 17, body: 17, callout: 16, subheadline: 15,
  footnote: 13, caption1: 12, caption2: 11,
  dataLarge: 32, dataMedium: 20, dataSmall: 14,
};

export const spacing = {
  xxs: 2, xs: 4, sm: 8, md: 12, base: 16,
  lg: 20, xl: 24, '2xl': 32, '3xl': 40, '4xl': 48, '5xl': 64,
};

export const radius = {
  none: 0, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 28, full: 9999,
};
```

#### Key Migration Steps

1. **Replace `palette` with `color`** — new neutral surface system replaces the green-tinted panels
2. **Replace `fonts` with `font`** — swap Quicksand for Inter, add more weight variants
3. **Remove `fs()` multiplier** — use sizes directly from the `size` object. No artificial scaling.
4. **Remove `AmbientBackground`** — replace with solid `color.base` or `color.elevated1`
5. **Remove all `panelStroke` borders** — use elevation (surface color steps) to separate content
6. **Replace neon glow shadows** — use the card/raised/floating shadow system from tokens
7. **Update all `borderRadius`** — use the `radius` scale; nested elements follow `outer - padding` rule
8. **Add `expo-google-fonts/inter`** — install Inter font family via `npx expo install @expo-google-fonts/inter`

#### Accessibility Checklist

- [ ] All text meets WCAG AA contrast (4.5:1 body, 3:1 large text) — use text opacity system
- [ ] All touch targets ≥ 44×44px
- [ ] `accessibilityRole` on all interactive elements
- [ ] `accessibilityState` for disabled, selected, busy
- [ ] `accessibilityLabel` on icon-only buttons
- [ ] Reduced motion support: check `AccessibilityInfo` and conditionally disable springs
- [ ] VoiceOver/TalkBack tested for game result announcements
- [ ] No color-only indicators: always pair color with text or icon

---

*TapRush Design System v2.0 — Designed with Apple HIG principles: clarity, deference, depth.*
*March 2026*
