---
name: Cockpit Slate Industrial
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#7bd0ff'
  on-tertiary: '#00354a'
  tertiary-container: '#19aee8'
  on-tertiary-container: '#003e55'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-telemetry-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
  label-telemetry-md:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  label-telemetry-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 2.5rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 1.75rem
  space-xl: 2.5rem
---

# Cockpit Slate Industrial Design System
*Extracted via Google Stitch MCP (Project ID: 14634243743914510062)*

## Brand & Style
This design system is engineered for industrial vehicular cockpit environments where high-vibration cabins, glare, harsh sunlight, and nighttime operation demand immediate visual clarity and high-confidence physical interactions. The aesthetic blends rugged commercial utility with refined modern telemetry software—evoking precision instrumentation, heavy transport durability, and mission-critical reliability.

The target audience consists of commercial drivers, fleet operators, and logistics field staff operating in varied lighting conditions, often using dashboard-mounted hardware or rugged handheld devices while wearing work gloves.

The visual language employs an industrial dark-cockpit philosophy: ultra-deep slate and obsidian surfaces eliminate eye fatigue during night routes while providing infinite contrast for vital instrumentation signals. Critical telemetry, sync alerts, and financial payloads are communicated through unmissable structural blocks, tactile modular cards, high-legibility tabular figures, and persistent status indicators that communicate operational state at a glance.

## Colors
The color palette centers on maximum situational awareness and unambiguous state transitions:
- **Primary (`#10B981` Emerald Telemetry):** Operational pulse. Synced status, completed actions, active engine/trip status.
- **Secondary (`#F59E0B` High-Vis Amber):** Caution, offline status, local cache queueing, pending manifest syncs.
- **Tertiary (`#38BDF8` Navigational Cyan):** Turn-by-turn routing indicators and cold telemetry sensors.
- **Neutral Canvas (`#090D16` Deep Cockpit Slate):** Base ground canvas, container elevated slate `#0F172A`, bordered by structured zinc `#1E293B`.

## Typography
- **Headlines (`Space Grotesk`):** Robust, mechanical visual voice for alerts and headers.
- **Body & Interface (`Plus Jakarta Sans`):** Wide aperture legibility for instructions and descriptions.
- **Data, Currency & Odometers (`JetBrains Mono`):** Tabular figures for KM, INR ₹, timestamps, liters, and IDs.

## Physical Touch Zones & Dimensions
- Primary buttons: Minimum height 60px.
- Secondary buttons: Minimum height 56px.
- Active tactile feedback: `scale(0.98)` and haptic vibration (`navigator.vibrate([40])`).
- Generous gutters prevent mis-taps on bumpy roads.
