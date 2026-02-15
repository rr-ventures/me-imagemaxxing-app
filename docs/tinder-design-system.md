# Tinder Design System Artifact

## 1. Color Palette

### Primary Brand Gradient
The iconic Tinder gradient is the core of the brand identity.
- **Start:** `#FD267A` (Radical Red)
- **End:** `#FF6036` (Red Orange) - *Note: Often cited as #FF7854, but #FF6036 is the vibrant core.*

### Secondary Colors
- **Blue (Super Like):** `#2196F3` or `#1597F4`
- **Purple (Lightning Bolt/Boost):** `#A307BA` or `#915DD1`
- **Green (Like/Heart):** `#4ECC94` or `#00E392`
- **Gold (Gold/Premium):** `#E3C067` or `#F7B944`

### Neutrals (Light Mode)
- **Background:** `#FFFFFF`
- **Text Primary:** `#212121`
- **Text Secondary:** `#757575`
- **Border/Divider:** `#E0E0E0`
- **Input Background:** `#F0F0F0`

### Neutrals (Dark Mode)
- **Background:** `#111418` (Obsidian)
- **Text Primary:** `#FFFFFF`
- **Text Secondary:** `#B0B3C7`
- **Input Background:** `#21262E`

## 2. Typography

Tinder uses **Proxima Nova** primarily.
- **Headings:** Bold / ExtraBold. Tends to be large and expressive.
- **Body:** Medium / Regular.
- **Buttons:** Semibold / Bold. All caps is common for primary actions in older designs, but sentence case is modern.

*Fallback Stack:* `Proxima Nova`, `Helvetica Neue`, `Arial`, `sans-serif`.

## 3. Shapes & Layout

- **Border Radius:**
  - **Buttons:** Full pill shape (`9999px` or `rounded-full`).
  - **Cards:** Large rounded corners (`16px` to `24px` or `rounded-2xl` / `rounded-3xl`).
  - **Inputs:** Rounded corners (`8px` to `12px` or `rounded-lg`).

- **Shadows:**
  - **Cards:** Soft, diffuse shadows to make them pop off the stack.
    - `0 10px 20px rgba(0,0,0,0.08)`
  - **Floating Action Buttons:** Distinct drop shadow.
    - `0 4px 12px rgba(0,0,0,0.15)`

## 4. Components

### Buttons
- **Primary:** Full width or large pill. Background is the Brand Gradient. Text is White.
- **Secondary:** Outline with Brand Gradient border, or Gray background.
- **Icon Buttons:** Circular with specific action colors (Green Heart, Red X).

### Cards (Swipe Deck)
- Aspect ratio roughly 3:4 or filling the available height minus headers/footers.
- Image covers the full card.
- Text overlay at the bottom with a gradient fade (black transparent to transparent) for readability.

### Navigation
- Top bar with Logo (center) and Profile/Chat icons (left/right).
- Bottom tab bar (on mobile) or side navigation (on web).

## 5. Web Specifics
- **Login Screen:** Often features a clean white modal or page with the gradient logo, or a full-screen hero image with the gradient overlay.
- **Matches Sidebar:** On the left, scrollable list of matches.
- **Chat Area:** On the right, clean conversation view.

---
*Generated based on analysis of Tinder UI resources and screenshots.*
