---
name: Serenity & Grounding
colors:
  surface: '#fdf9f0'
  surface-dim: '#dedad1'
  surface-bright: '#fdf9f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ea'
  surface-container: '#f2ede4'
  surface-container-high: '#ece8df'
  surface-container-highest: '#e6e2d9'
  on-surface: '#1c1c16'
  on-surface-variant: '#434843'
  inverse-surface: '#32302a'
  inverse-on-surface: '#f5f0e7'
  outline: '#737872'
  outline-variant: '#c3c8c1'
  surface-tint: '#4f6353'
  primary: '#4f6353'
  on-primary: '#ffffff'
  primary-container: '#8da290'
  on-primary-container: '#26382b'
  inverse-primary: '#b6ccb9'
  secondary: '#8a4f35'
  on-secondary: '#ffffff'
  secondary-container: '#ffb292'
  on-secondary-container: '#794229'
  tertiary: '#75565a'
  on-tertiary: '#ffffff'
  tertiary-container: '#b89498'
  on-tertiary-container: '#472d31'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d2e8d4'
  primary-fixed-dim: '#b6ccb9'
  on-primary-fixed: '#0d1f13'
  on-primary-fixed-variant: '#384b3d'
  secondary-fixed: '#ffdbcd'
  secondary-fixed-dim: '#ffb597'
  on-secondary-fixed: '#360f00'
  on-secondary-fixed-variant: '#6d3820'
  tertiary-fixed: '#ffd9dd'
  tertiary-fixed-dim: '#e4bdc1'
  on-tertiary-fixed: '#2b1519'
  on-tertiary-fixed-variant: '#5b3f43'
  background: '#fdf9f0'
  on-background: '#1c1c16'
  surface-variant: '#e6e2d9'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  caption:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style

This design system is built for a private clinical psychology practice, focusing on the emotional bridge between professional clinical excellence and deep, humanized comfort. The brand personality is empathetic, stable, and transparent. It avoids the coldness of traditional medical interfaces in favor of a "sanctuary" aesthetic—a digital safe space that reduces cognitive load for patients who may be in distress.

The style is **Minimalist** with a **Tactile** warmth. It leverages generous whitespace to symbolize "room to breathe," high-quality typography for clarity, and a soft, layered approach to UI elements that feels approachable rather than rigid.

## Colors

The palette is inspired by natural, grounding elements to evoke a sense of calm and stability.

- **Primary (Sage Green - #8DA290):** Used for primary actions, success states, and subtle branding elements. It represents growth and tranquility.
- **Secondary (Terracotta - #C17D60):** Reserved for high-impact Call-to-Actions (CTAs) like "Agendar Consulta." Its warmth provides a human touch and clear direction.
- **Background (Soft Sand - #F9F7F2):** The foundation of the UI. This off-white reduces eye strain compared to pure white and feels more organic and welcoming.
- **Typography (Dark Charcoal - #2D2D2D):** A soft black that provides high contrast for accessibility while remaining gentler on the eyes than absolute black.
- **Neutrals:** Used for borders, disabled states, and secondary surfaces to maintain the monochromatic harmony of the sand-based theme.

## Typography

**Plus Jakarta Sans** is the sole typeface for this design system. Its modern, slightly rounded apertures offer a friendly and optimistic tone while maintaining the precision required for a professional clinical setting.

- **Headlines:** Use a tighter letter-spacing and heavier weights to establish clear hierarchy and a sense of "anchoring."
- **Body Text:** Set with generous line height (1.6) to ensure maximum readability and a relaxed pacing for longer texts about therapeutic approaches or therapist bios.
- **Alignment:** Primarily left-aligned to assist with reading flow, especially for sensitive information.

## Layout & Spacing

The design system utilizes a **Fixed Grid** model for desktop and a **Fluid** model for mobile to maintain a controlled, serene composition.

- **Desktop:** 12-column grid with a 1200px max-width. Sections are separated by "XL" (80px) vertical spacing to prevent information density from feeling overwhelming.
- **Mobile:** 4-column fluid grid with 16px side margins.
- **Spacing Rhythm:** Based on an 8px scale. Use "LG" (48px) padding for cards and containers to reinforce the sense of whitespace and safety. Elements should never feel "cramped" against their borders.

## Elevation & Depth

To maintain the "safe atmosphere," depth is created through **Tonal Layers** and **Ambient Shadows**.

- **Surfaces:** Use the background color (#F9F7F2) for the page, and a pure white or slightly lighter tint for elevated cards.
- **Shadows:** Avoid harsh, dark shadows. Use extremely diffused, low-opacity shadows (e.g., `rgba(45, 45, 45, 0.05)`) with a large blur radius (20px+) to make components appear as if they are gently resting on a soft surface.
- **Interactive States:** On hover, elements should lift slightly (y-axis shift) rather than changing color dramatically, mimicking a physical, tactile response.

## Shapes

The shape language is defined by **Rounded** corners (0.5rem / 8px base). This choice eliminates "sharp edges" from the UI, psychologically reinforcing the brand's comforting and gentle nature.

- **Standard Elements:** Inputs, buttons, and small cards use the base 8px radius.
- **Large Containers:** Content sections and main feature cards use `rounded-lg` (16px) or `rounded-xl` (24px) to create a softer, organic frame for information.
- **Images:** Therapeutic imagery or headshots should always feature rounded corners to match the UI components.

## Components

- **Buttons:** Primary buttons use the Sage Green background with white text. CTA buttons (Agendar) use the Terracotta background. Both feature 24px horizontal padding and semi-bold labels.
- **Input Fields:** Fields should have a subtle #E5E1D8 border and a soft sand background. Focus states use a Sage Green border with a very faint glow.
- **Cards:** Used for therapist profiles or service descriptions. Cards should have a white background, the \"Ambient Shadow,\" and 32px internal padding.
- **Chips/Badges:** Use low-contrast variations of the primary colors (e.g., Sage Green at 10% opacity) for categorizing therapy types (ex: \"Ansiedade,\" \"Terapia de Casal\").
- **Lists:** Use custom Sage Green bullet points or icons instead of standard dots to maintain brand cohesion.
- **Special Component - \"Emergency Exit\":** A discreet but accessible fixed button for patients needing immediate help (e.g., CVV link), styled in a neutral but clear tone.
