---
name: Swiggy
colors:
  background: "#ffffff"
  foreground: "#282c3f" # Swiggy Charcoal
  brand: "#fc8019"      # Primary Orange
  muted: "#686b78"
  border: "#e9e9eb"
  card: "#ffffff"
  accent: "#fc8019"
  
  dark:
    background: "#121212"
    foreground: "#e9e9eb"
    muted: "#93959f"
    border: "#282c3f"
    card: "#1a1a1a"
    accent: "#fc8019"

typography:
  fontFamily:
    sans: "Basis Grotesque Pro, system-ui, sans-serif"
  body:
    fontSize: "14px"
    lineHeight: "1.4"
  heading:
    fontWeight: "700"
    letterSpacing: "-0.02em"

rounded:
  default: "0px" # Swiggy marketing often uses sharp edges
  md: "8px"    # UI components use soft rounding
  full: "9999px"
---

# Design System: Swiggy

## Overview
Swiggy's design system is vibrant, approachable, and focused on "Delivery Happiness." It centers around a signature orange that communicates warmth, speed, and reliability.

## Design Philosophy
1. **Warm & Reliable:** The brand uses warm oranges and yellows to feel friendly and dependable.
2. **Clutter-Free Discovery:** Prioritizes clean horizontal lanes and focused content hierarchy.
3. **Information Transparency:** Clearly displays delivery time, distance, amounts, and status without ambiguity.
4. **The "Orange Thread":** Swiggy Orange (#FC8019) is the primary navigation guide through the app.

## Colors
- **Swiggy Orange (#FC8019):** A vibrant orange representing core energy and the delivery fleet.
- **Charcoal (#282C3F):** Primary text providing sophisticated contrast.
- **Secondary Accents:** Yellows (#F3C334) for offers and highlights.
- **Muted Gray (#686B78):** Secondary text and metadata (contrast ≥ 4.5:1 on light backgrounds).
- **Border (#E9E9EB):** Subtle structural dividing lines.

## Typography
- **Primary:** `Basis Grotesque Pro, system-ui, sans-serif`
- **Body:** 14px, line-height 1.4
- **Headings:** Font weight 700, letter spacing -0.02em
- **Amounts:** Tabular numbers for clear financial alignment

## Corner Radius
- **Default:** 0px (sharp marketing and structural edges)
- **Medium:** 8px (interactive UI components, cards, buttons)
- **Full:** 9999px (pills, badges, avatars)
